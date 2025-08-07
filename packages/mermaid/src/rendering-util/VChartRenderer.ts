import type { VChart } from '@visactor/vchart';
import type { SVG } from '../diagram-api/types.js';
import { selectSvgElement } from './selectSvgElement.js';
import { configureSvgSize } from '../setupGraphViewbox.js';
import { log } from '../logger.js';

/**
 * VChart渲染器基类，提供统一的VChart集成接口
 */
export abstract class VChartRenderer {
  protected chart: VChart | null = null;
  protected container: HTMLElement | null = null;

  /**
   * 抽象方法：子类需要实现如何转换mermaid数据为VChart规格
   */
  protected abstract createVChartSpec(data: any, config: any): any;

  /**
   * 抽象方法：子类需要实现如何应用主题
   */
  protected abstract applyTheme(spec: any, themeVariables: any): any;

  /**
   * 初始化VChart容器
   */
  protected initContainer(id: string): HTMLElement {
    const svg: SVG = selectSvgElement(id);
    // 创建一个div容器来承载VChart
    const foreignObject = svg.append('foreignObject').attr('width', '100%').attr('height', '100%');

    const container = foreignObject
      .append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .node() as HTMLElement;

    this.container = container;
    return container;
  }

  /**
   * 渲染VChart图表
   */
  protected async renderVChart(
    spec: any,
    container: HTMLElement,
    width: number,
    height: number
  ): Promise<VChart> {
    try {
      // 动态导入VChart
      const { VChart } = await import('@visactor/vchart');

      // 设置图表尺寸
      const chartSpec = {
        ...spec,
        width,
        height,
      };

      // 创建VChart实例
      this.chart = new VChart(chartSpec, {
        dom: container,
        mode: 'desktop-browser',
        animation: true,
      });

      // 渲染图表
      await this.chart.renderAsync();

      log.debug('VChart rendered successfully');
      return this.chart;
    } catch (error) {
      log.error('Failed to render VChart:', error);
      throw new Error(`VChart rendering failed: ${String(error)}`);
    }
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    if (this.chart) {
      this.chart.release();
      this.chart = null;
    }
    this.container = null;
  }

  /**
   * 通用的绘制方法模板
   */
  public async render(
    text: string,
    id: string,
    _version: string,
    diagObj: any,
    width: number,
    height: number
  ): Promise<void> {
    log.debug(`Rendering ${this.constructor.name} with VChart\n${text}`);

    try {
      // 获取数据和配置
      const db = diagObj.db;
      const config = db.getConfig();
      const data = this.extractData(db);

      // 创建VChart规格
      let spec = this.createVChartSpec(data, config);

      // 应用主题
      const { themeVariables } = diagObj.globalConfig ?? {};
      if (themeVariables) {
        spec = this.applyTheme(spec, themeVariables);
      }

      // 初始化容器
      const container = this.initContainer(id);

      // 渲染图表
      await this.renderVChart(spec, container, width, height);

      // 配置SVG大小
      const svg = selectSvgElement(id);
      configureSvgSize(svg, height, width, config.useMaxWidth);
    } catch (error) {
      log.error(`Failed to render ${this.constructor.name}:`, error);
      // 回退到错误状态或默认渲染器
      throw error;
    }
  }

  /**
   * 从数据库提取数据的抽象方法
   */
  protected abstract extractData(db: any): any;
}

/**
 * VChart渲染器工厂，用于根据配置选择渲染器
 */
export class VChartRendererFactory {
  /**
   * 检查是否应该使用VChart渲染器
   */
  static shouldUseVChart(config: any): boolean {
    return config?.renderer === 'vchart';
  }

  /**
   * 检查VChart是否可用
   */
  static async isVChartAvailable(): Promise<boolean> {
    try {
      await import('@visactor/vchart');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 创建条件渲染器包装器
   */
  static createConditionalRenderer<T extends any[]>(
    vchartRenderer: (...args: T) => Promise<void>,
    defaultRenderer: (...args: T) => void,
    getConfig: (diagObj: any) => any
  ): (...args: T) => Promise<void> | void {
    return async (...args: T) => {
      const diagObj = args[3]; // diagObj是第4个参数
      const config = getConfig(diagObj);

      if (VChartRendererFactory.shouldUseVChart(config)) {
        // 检查VChart是否可用
        const isAvailable = await VChartRendererFactory.isVChartAvailable();
        if (isAvailable) {
          return await vchartRenderer(...args);
        } else {
          log.warn('VChart not available, falling back to default renderer');
        }
      }

      // 使用默认渲染器
      return defaultRenderer(...args);
    };
  }
}
