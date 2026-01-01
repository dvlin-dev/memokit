/**
 * [INPUT]: URL 字符串
 * [OUTPUT]: 验证结果（valid/invalid + 错误信息）
 * [POS]: URL 安全验证，SSRF 防护，阻止访问内部网络
 */

import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';
import { InvalidUrlError, UrlNotAllowedError } from './screenshot.errors';

/** URL 验证结果 */
export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  error?: string;
}

/** 黑名单主机 */
const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
  // 云服务商元数据服务
  'metadata.google.internal',
  'metadata.goog',
  '169.254.169.254',
  'fd00:ec2::254',
]);

/** 黑名单主机后缀 */
const BLOCKED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.localdomain',
];

/**
 * 检查 IP 是否为私有地址
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 私有地址范围
  const ipv4Patterns = [
    /^10\./,                        // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,                  // 192.168.0.0/16
    /^127\./,                       // 127.0.0.0/8 (loopback)
    /^169\.254\./,                  // 169.254.0.0/16 (link-local)
    /^0\./,                         // 0.0.0.0/8
  ];

  // IPv6 私有地址
  const ipv6Patterns = [
    /^::1$/,                        // loopback
    /^fe80:/i,                      // link-local
    /^fc00:/i,                      // unique local
    /^fd[0-9a-f]{2}:/i,             // unique local
    /^::ffff:(?:10\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.)/i, // IPv4-mapped
  ];

  // 检查 IPv4
  for (const pattern of ipv4Patterns) {
    if (pattern.test(ip)) {
      return true;
    }
  }

  // 检查 IPv6
  for (const pattern of ipv6Patterns) {
    if (pattern.test(ip)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查主机名是否在黑名单中
 */
function isBlockedHost(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();

  // 直接匹配
  if (BLOCKED_HOSTS.has(lowerHostname)) {
    return true;
  }

  // 后缀匹配
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (lowerHostname.endsWith(suffix)) {
      return true;
    }
  }

  return false;
}

/**
 * 检查字符串是否为 IP 地址
 */
function isIPAddress(str: string): boolean {
  // IPv4
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(str)) {
    return true;
  }
  // IPv6 (简化检查)
  if (str.includes(':')) {
    return true;
  }
  return false;
}

@Injectable()
export class UrlValidator {
  private readonly logger = new Logger(UrlValidator.name);

  /**
   * 验证 URL 是否安全可访问
   * @param url 要验证的 URL
   * @throws InvalidUrlError URL 格式无效
   * @throws UrlNotAllowedError URL 被安全策略阻止
   */
  async validate(url: string): Promise<void> {
    // 1. 基础格式验证
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new InvalidUrlError(url, 'Invalid URL format');
    }

    // 2. 协议检查（仅允许 http/https）
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new UrlNotAllowedError(url, 'Only HTTP/HTTPS protocols are allowed');
    }

    // 3. 主机名不能为空
    if (!parsed.hostname) {
      throw new InvalidUrlError(url, 'Hostname is required');
    }

    // 4. 检查主机名黑名单
    if (isBlockedHost(parsed.hostname)) {
      throw new UrlNotAllowedError(url, 'Host is not allowed');
    }

    // 5. 如果是 IP 地址，直接检查是否为私有 IP
    if (isIPAddress(parsed.hostname)) {
      if (isPrivateIP(parsed.hostname)) {
        throw new UrlNotAllowedError(url, 'Private IP addresses are not allowed');
      }
      return; // IP 地址验证通过
    }

    // 6. DNS 解析并检查解析后的 IP（防止 DNS rebinding 攻击）
    try {
      const addresses = await this.resolveDns(parsed.hostname);

      for (const ip of addresses) {
        if (isPrivateIP(ip)) {
          this.logger.warn(
            `DNS rebinding attempt detected: ${parsed.hostname} -> ${ip}`,
          );
          throw new UrlNotAllowedError(url, 'Resolved IP address is not allowed');
        }
      }
    } catch (error) {
      // 如果是我们自己抛出的错误，直接重新抛出
      if (error instanceof UrlNotAllowedError) {
        throw error;
      }

      // DNS 解析失败
      this.logger.warn(`DNS resolution failed for ${parsed.hostname}: ${error}`);
      throw new InvalidUrlError(url, 'Failed to resolve hostname');
    }
  }

  /**
   * 解析 DNS（同时获取 IPv4 和 IPv6）
   */
  private async resolveDns(hostname: string): Promise<string[]> {
    const results: string[] = [];

    // 尝试解析 A 记录（IPv4）
    try {
      const ipv4 = await dns.resolve4(hostname);
      results.push(...ipv4);
    } catch {
      // 忽略，可能没有 IPv4 记录
    }

    // 尝试解析 AAAA 记录（IPv6）
    try {
      const ipv6 = await dns.resolve6(hostname);
      results.push(...ipv6);
    } catch {
      // 忽略，可能没有 IPv6 记录
    }

    if (results.length === 0) {
      throw new Error('No DNS records found');
    }

    return results;
  }
}
