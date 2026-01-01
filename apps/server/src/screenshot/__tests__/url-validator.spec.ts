/**
 * UrlValidator 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UrlValidator } from '../url-validator';
import { InvalidUrlError, UrlNotAllowedError } from '../screenshot.errors';

// Mock DNS 模块
vi.mock('dns', () => ({
  promises: {
    resolve4: vi.fn(),
    resolve6: vi.fn(),
  },
}));

import { promises as dns } from 'dns';

describe('UrlValidator', () => {
  let validator: UrlValidator;

  beforeEach(() => {
    validator = new UrlValidator();
    vi.clearAllMocks();
  });

  describe('validate - 基础格式验证', () => {
    it('应该接受合法的 HTTPS URL', async () => {
      vi.mocked(dns.resolve4).mockResolvedValue(['93.184.216.34']);
      vi.mocked(dns.resolve6).mockRejectedValue(new Error('No AAAA record'));

      await expect(validator.validate('https://example.com')).resolves.not.toThrow();
    });

    it('应该接受合法的 HTTP URL', async () => {
      vi.mocked(dns.resolve4).mockResolvedValue(['93.184.216.34']);
      vi.mocked(dns.resolve6).mockRejectedValue(new Error('No AAAA record'));

      await expect(validator.validate('http://example.com')).resolves.not.toThrow();
    });

    it('应该拒绝无效的 URL 格式', async () => {
      await expect(validator.validate('not-a-url')).rejects.toThrow(InvalidUrlError);
    });

    it('应该拒绝空 URL', async () => {
      await expect(validator.validate('')).rejects.toThrow(InvalidUrlError);
    });

    it('应该拒绝非 HTTP/HTTPS 协议', async () => {
      await expect(validator.validate('ftp://example.com')).rejects.toThrow(UrlNotAllowedError);
      await expect(validator.validate('file:///etc/passwd')).rejects.toThrow(UrlNotAllowedError);
      await expect(validator.validate('javascript:alert(1)')).rejects.toThrow();
    });

    it('应该拒绝缺少主机名的 URL', async () => {
      await expect(validator.validate('http://')).rejects.toThrow(InvalidUrlError);
    });
  });

  describe('validate - 主机名黑名单', () => {
    it('应该拒绝 localhost', async () => {
      await expect(validator.validate('http://localhost')).rejects.toThrow(UrlNotAllowedError);
      await expect(validator.validate('http://localhost:3000')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝 localhost 变体', async () => {
      await expect(validator.validate('http://localhost.localdomain')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝 127.0.0.1', async () => {
      await expect(validator.validate('http://127.0.0.1')).rejects.toThrow(UrlNotAllowedError);
      await expect(validator.validate('http://127.0.0.1:8080')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝 0.0.0.0', async () => {
      await expect(validator.validate('http://0.0.0.0')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝 .local 后缀', async () => {
      await expect(validator.validate('http://myserver.local')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝 .internal 后缀', async () => {
      await expect(validator.validate('http://api.internal')).rejects.toThrow(UrlNotAllowedError);
    });
  });

  describe('validate - 云厂商 Metadata 防护', () => {
    it('应该拒绝 AWS/GCP/Azure Metadata 地址', async () => {
      await expect(validator.validate('http://169.254.169.254')).rejects.toThrow(UrlNotAllowedError);
      await expect(validator.validate('http://169.254.169.254/latest/meta-data')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝 Google 内部 Metadata 主机', async () => {
      await expect(validator.validate('http://metadata.google.internal')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝 AWS EC2 IPv6 Metadata 地址', async () => {
      // fd00:ec2::254 是 AWS EC2 的 IPv6 metadata 地址，属于 fd00::/8 私有地址范围
      // 注意：此 IP 在 BLOCKED_HOSTS 中定义为字符串，需要准确匹配
      await expect(validator.validate('http://fd00:ec2::254')).rejects.toThrow();
    });
  });

  describe('validate - 私有 IP 地址', () => {
    it('应该拒绝 10.x.x.x 私有地址', async () => {
      await expect(validator.validate('http://10.0.0.1')).rejects.toThrow(UrlNotAllowedError);
      await expect(validator.validate('http://10.255.255.255')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝 172.16.x.x - 172.31.x.x 私有地址', async () => {
      await expect(validator.validate('http://172.16.0.1')).rejects.toThrow(UrlNotAllowedError);
      await expect(validator.validate('http://172.31.255.255')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该接受 172.15.x.x（非私有范围）', async () => {
      vi.mocked(dns.resolve4).mockResolvedValue(['172.15.0.1']);
      vi.mocked(dns.resolve6).mockRejectedValue(new Error('No AAAA record'));

      // 172.15.x.x 不是私有地址，但直接 IP 访问需要检查
      await expect(validator.validate('http://172.15.0.1')).resolves.not.toThrow();
    });

    it('应该拒绝 192.168.x.x 私有地址', async () => {
      await expect(validator.validate('http://192.168.0.1')).rejects.toThrow(UrlNotAllowedError);
      await expect(validator.validate('http://192.168.1.1')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝 169.254.x.x 链路本地地址', async () => {
      await expect(validator.validate('http://169.254.1.1')).rejects.toThrow(UrlNotAllowedError);
    });
  });

  describe('validate - DNS Rebinding 防护', () => {
    it('应该拒绝解析到私有 IP 的域名', async () => {
      vi.mocked(dns.resolve4).mockResolvedValue(['192.168.1.1']);
      vi.mocked(dns.resolve6).mockRejectedValue(new Error('No AAAA record'));

      await expect(validator.validate('https://evil.com')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝解析到 127.0.0.1 的域名', async () => {
      vi.mocked(dns.resolve4).mockResolvedValue(['127.0.0.1']);
      vi.mocked(dns.resolve6).mockRejectedValue(new Error('No AAAA record'));

      await expect(validator.validate('https://attacker.com')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝解析到 IPv6 私有地址的域名', async () => {
      vi.mocked(dns.resolve4).mockRejectedValue(new Error('No A record'));
      vi.mocked(dns.resolve6).mockResolvedValue(['::1']);

      await expect(validator.validate('https://evil-ipv6.com')).rejects.toThrow(UrlNotAllowedError);
    });

    it('应该拒绝多个 IP 中包含私有 IP 的域名', async () => {
      vi.mocked(dns.resolve4).mockResolvedValue(['8.8.8.8', '192.168.1.1']);
      vi.mocked(dns.resolve6).mockRejectedValue(new Error('No AAAA record'));

      await expect(validator.validate('https://mixed.com')).rejects.toThrow(UrlNotAllowedError);
    });

    it('DNS 解析失败时应该抛出错误', async () => {
      vi.mocked(dns.resolve4).mockRejectedValue(new Error('DNS lookup failed'));
      vi.mocked(dns.resolve6).mockRejectedValue(new Error('DNS lookup failed'));

      await expect(validator.validate('https://nonexistent.invalid')).rejects.toThrow(InvalidUrlError);
    });
  });

  describe('validate - 合法公网地址', () => {
    beforeEach(() => {
      vi.mocked(dns.resolve4).mockResolvedValue(['93.184.216.34']);
      vi.mocked(dns.resolve6).mockRejectedValue(new Error('No AAAA record'));
    });

    it('应该接受 example.com', async () => {
      await expect(validator.validate('https://example.com')).resolves.not.toThrow();
    });

    it('应该接受带路径的 URL', async () => {
      await expect(validator.validate('https://example.com/path/to/page')).resolves.not.toThrow();
    });

    it('应该接受带查询参数的 URL', async () => {
      await expect(validator.validate('https://example.com?foo=bar&baz=qux')).resolves.not.toThrow();
    });

    it('应该接受带端口的 URL', async () => {
      await expect(validator.validate('https://example.com:8443')).resolves.not.toThrow();
    });

    it('应该接受子域名', async () => {
      await expect(validator.validate('https://www.example.com')).resolves.not.toThrow();
      await expect(validator.validate('https://api.example.com')).resolves.not.toThrow();
    });
  });
});
