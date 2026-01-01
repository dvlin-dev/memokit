/**
 * ImageProcessor 单元测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ImageProcessor } from '../image-processor';
import type { ProcessOptions } from '../screenshot.types';

describe('ImageProcessor', () => {
  let processor: ImageProcessor;
  let testImageBuffer: Buffer;

  beforeEach(async () => {
    processor = new ImageProcessor();

    // 创建一个简单的测试图片（1x1 红色 PNG）
    // PNG 文件头 + IHDR + IDAT + IEND
    testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk length and type
      0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x64, // width=100, height=100
      0x08, 0x02, 0x00, 0x00, 0x00, 0xff, 0x80, 0x02, // bit depth, color type, etc.
      0x03, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // CRC + IEND
      0x44, 0xae, 0x42, 0x60, 0x82, // IEND chunk
    ]);
  });

  describe('getInfo', () => {
    it('应该返回图片基本信息', async () => {
      // 创建一个有效的测试图片
      const sharp = await import('sharp');
      const validImage = await sharp.default({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const info = await processor.getInfo(validImage);

      expect(info.width).toBe(100);
      expect(info.height).toBe(100);
      expect(info.format).toBe('png');
    });
  });

  describe('process', () => {
    let validImage: Buffer;

    beforeEach(async () => {
      const sharp = await import('sharp');
      validImage = await sharp.default({
        create: {
          width: 200,
          height: 150,
          channels: 3,
          background: { r: 100, g: 150, b: 200 },
        },
      })
        .png()
        .toBuffer();
    });

    it('应该处理 PNG 格式', async () => {
      const options: ProcessOptions = {
        format: 'png',
        quality: 80,
        addWatermark: false,
      };

      const result = await processor.process(validImage, options);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
      expect(result.fileSize).toBe(result.buffer.length);
    });

    it('应该处理 JPEG 格式', async () => {
      const options: ProcessOptions = {
        format: 'jpeg',
        quality: 80,
        addWatermark: false,
      };

      const result = await processor.process(validImage, options);

      expect(result.buffer).toBeInstanceOf(Buffer);
      // JPEG 通常比 PNG 小
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('应该处理 WebP 格式', async () => {
      const options: ProcessOptions = {
        format: 'webp',
        quality: 80,
        addWatermark: false,
      };

      const result = await processor.process(validImage, options);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('不同质量参数应该产生不同大小的输出', async () => {
      const highQualityOptions: ProcessOptions = {
        format: 'jpeg',
        quality: 100,
        addWatermark: false,
      };

      const lowQualityOptions: ProcessOptions = {
        format: 'jpeg',
        quality: 10,
        addWatermark: false,
      };

      const highQualityResult = await processor.process(validImage, highQualityOptions);
      const lowQualityResult = await processor.process(validImage, lowQualityOptions);

      // 高质量图片通常比低质量大
      expect(highQualityResult.fileSize).toBeGreaterThan(lowQualityResult.fileSize);
    });

    it('应该添加水印', async () => {
      // 创建一个更大的图片来测试水印
      const sharp = await import('sharp');
      const largeImage = await sharp.default({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .png()
        .toBuffer();

      const withWatermark: ProcessOptions = {
        format: 'png',
        quality: 80,
        addWatermark: true,
      };

      const withoutWatermark: ProcessOptions = {
        format: 'png',
        quality: 80,
        addWatermark: false,
      };

      const resultWith = await processor.process(largeImage, withWatermark);
      const resultWithout = await processor.process(largeImage, withoutWatermark);

      // 有水印的图片应该和无水印的不同
      expect(resultWith.buffer.equals(resultWithout.buffer)).toBe(false);
    });
  });

  describe('convert', () => {
    let validImage: Buffer;

    beforeEach(async () => {
      const sharp = await import('sharp');
      validImage = await sharp.default({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .png()
        .toBuffer();
    });

    it('应该转换 PNG 到 JPEG', async () => {
      const result = await processor.convert(validImage, 'jpeg', 80);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('应该转换 PNG 到 WebP', async () => {
      const result = await processor.convert(validImage, 'webp', 80);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('应该保持 PNG 格式', async () => {
      const result = await processor.convert(validImage, 'png', 80);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('resize', () => {
    let validImage: Buffer;

    beforeEach(async () => {
      const sharp = await import('sharp');
      validImage = await sharp.default({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .png()
        .toBuffer();
    });

    it('应该调整图片大小', async () => {
      const result = await processor.resize(validImage, 200, 150);

      expect(result).toBeInstanceOf(Buffer);

      // 验证调整后的尺寸
      const info = await processor.getInfo(result);
      expect(info.width).toBe(200);
      expect(info.height).toBe(150);
    });

    it('应该支持 cover 模式', async () => {
      const result = await processor.resize(validImage, 100, 100, { fit: 'cover' });

      const info = await processor.getInfo(result);
      expect(info.width).toBe(100);
      expect(info.height).toBe(100);
    });

    it('应该支持 contain 模式', async () => {
      const result = await processor.resize(validImage, 100, 100, { fit: 'contain' });

      const info = await processor.getInfo(result);
      // contain 模式会保持宽高比，所以可能不是精确的 100x100
      expect(info.width).toBeLessThanOrEqual(100);
      expect(info.height).toBeLessThanOrEqual(100);
    });

    it('不应该放大图片', async () => {
      // 尝试放大到更大的尺寸
      const result = await processor.resize(validImage, 800, 600);

      const info = await processor.getInfo(result);
      // withoutEnlargement: true 应该阻止放大
      expect(info.width).toBeLessThanOrEqual(400);
      expect(info.height).toBeLessThanOrEqual(300);
    });
  });
});
