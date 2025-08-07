import type { Diagram } from '../../Diagram.js';
import { VChartRenderer } from '../../rendering-util/VChartRenderer.js';
import { log } from '../../logger.js';

/**
 * Sankey VChart渲染器类
 * 继承自VChartRenderer基类，实现桑基图的VChart渲染
 */
class SankeyVChartRenderer extends VChartRenderer {
  /**
   * 提取数据
   * 从数据库中提取桑基图数据
   */
  protected extractData(db: any): any {
    return db.getGraph();
  }

  /**
   * 创建VChart规范配置
   * 将mermaid桑基图数据转换为VChart桑基图规范
   */
  protected createVChartSpec(data: any, config: any): any {
    log.debug('Creating VChart spec for sankey chart', { data, config });

    // 转换数据格式为VChart期望的格式
    const chartData = this.transformData(data);

    // 应用主题配置
    const colorScheme = this.applyTheme();

    // 创建VChart桑基图规范
    const spec = {
      type: 'sankey',
      data: [
        {
          values: [chartData],
        },
      ],
      categoryField: 'id',
      valueField: 'value',
      sourceField: 'source',
      targetField: 'target',
      nodeKey: 'id',

      // 节点配置
      nodeAlign: config?.nodeAlignment ?? 'justify',
      nodeGap: 8,
      nodeWidth: config?.nodeWidth ?? 10,
      minNodeHeight: 4,

      // 标签配置
      label: {
        visible: config?.showValues !== false,
        style: {
          fontSize: 12,
          fill: '#333',
          fontFamily: 'Arial, sans-serif',
        },
      },

      // 节点样式
      node: {
        style: {
          fill: (datum: any, index: number) => colorScheme[index % colorScheme.length],
          stroke: '#fff',
          lineWidth: 1,
        },
        state: {
          hover: {
            stroke: '#333',
            lineWidth: 2,
          },
        },
      },

      // 链接样式
      link: {
        style: {
          fillOpacity: 0.6,
        },
        state: {
          hover: {
            fillOpacity: 0.8,
          },
        },
      },

      // 交互效果
      emphasis: {
        enable: true,
        effect: 'adjacency',
      },
    };

    log.debug('Generated VChart spec:', spec);
    return spec;
  }

  /**
   * 转换数据格式
   * 将mermaid桑基图数据转换为VChart格式
   */
  private transformData(graph: any): any {
    log.debug('Transforming sankey data:', graph);

    // 确保节点有唯一ID
    const nodes = graph.nodes.map((node: any, index: number) => ({
      id: node.id ?? `node-${index}`,
      nodeName: node.id ?? `Node ${index}`,
    }));

    // 确保链接有正确的source和target引用
    const links = graph.links.map((link: any) => ({
      source: link.source,
      target: link.target,
      value: link.value ?? 1,
    }));

    const transformedData = {
      nodes,
      links,
    };

    log.debug('Transformed data:', transformedData);
    return transformedData;
  }

  /**
   * 应用主题配置
   * 生成VChart颜色方案
   */
  protected applyTheme(): string[] {
    log.debug('Applying theme to sankey chart');

    // 使用默认色彩方案
    const colors = [
      '#ff6b6b',
      '#4ecdc4',
      '#45b7d1',
      '#96ceb4',
      '#feca57',
      '#ff9ff3',
      '#54a0ff',
      '#5f27cd',
      '#00d2d3',
      '#ff9f43',
      '#10ac84',
      '#ee5253',
    ];

    log.debug('Generated color scheme:', colors);
    return colors;
  }
}

/**
 * 使用VChart渲染桑基图
 * 这是对外暴露的渲染函数
 */
export async function drawWithVChart(
  text: string,
  id: string,
  version: string,
  diagObj: Diagram
): Promise<void> {
  log.debug('Drawing sankey chart with VChart', { text, id, version });

  const renderer = new SankeyVChartRenderer();
  await renderer.render(text, id, version, diagObj, 800, 600);
}
