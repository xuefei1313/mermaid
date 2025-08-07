import type { DrawDefinition } from '../../diagram-api/types.js';
import { log } from '../../logger.js';
import { VChartRenderer } from '../../rendering-util/VChartRenderer.js';
import type XYChartDB from './xychartDb.js';

/**
 * XY图表的VChart渲染器实现
 */
class XYChartVChartRenderer extends VChartRenderer {
  protected extractData(db: any): any {
    const xyChartData = db.getXYChartData();

    log.debug('XY Chart data:', xyChartData);

    if (!xyChartData?.plots?.length) {
      log.warn('No plot data found for XY chart');
      return {
        data: [],
        xField: 'x',
        yField: 'y',
        type: 'line',
        chartType: 'line',
        plots: [],
        xAxis: { type: 'band', title: '', categories: [] },
        yAxis: { type: 'linear', title: '', min: 0, max: 100 },
        title: '',
      };
    }

    const transformedData: any[] = [];

    // 处理每个层的数据
    xyChartData.plots.forEach((plot: any, plotIndex: number) => {
      plot.data.forEach((dataPoint: any) => {
        const [xValue, yValue] = dataPoint;
        transformedData.push({
          x: xValue,
          y: yValue,
          series: `Series ${plotIndex + 1}`,
          type: plot.type, // 'line' 或 'bar'
        });
      });
    });

    return {
      data: transformedData,
      xField: 'x',
      yField: 'y',
      seriesField: 'series',
      chartType: this.determineChartType(xyChartData),
      plots: xyChartData.plots,
      xAxis: xyChartData.xAxis,
      yAxis: xyChartData.yAxis,
      title: xyChartData.title,
    };
  }

  /**
   * 确定图表类型
   */
  private determineChartType(xyChartData: any): string {
    // 如果包含多种类型的图层，使用组合图表
    const plotTypes = new Set(xyChartData.plots.map((plot: any) => plot.type));

    if (plotTypes.size > 1) {
      return 'common'; // VChart组合图表
    }

    // 单一类型图表
    const firstPlotType = xyChartData.plots[0]?.type;
    switch (firstPlotType) {
      case 'line':
        return 'line';
      case 'bar':
        return 'bar';
      default:
        return 'line';
    }
  }

  /**
   * 开始创建VChart配置
   */
  protected createVChartSpec(data: any, _config: any): any {
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
    ];

    const spec: any = {
      type: data.chartType,
      padding: { top: 20, right: 20, bottom: 40, left: 60 },
      color: colors,
    };

    if (data.chartType === 'common') {
      spec.data = [
        {
          id: 'data',
          values: data.data,
        },
      ];

      spec.series = [];
      const seriesByType = new Map();
      data.plots.forEach((plot: any, index: number) => {
        const seriesKey = plot.type;
        if (!seriesByType.has(seriesKey)) {
          seriesByType.set(seriesKey, []);
        }
        seriesByType.get(seriesKey).push(`Series ${index + 1}`);
      });
      seriesByType.forEach((seriesNames, plotType) => {
        spec.series.push({
          type: plotType,
          data: {
            id: 'data',
          },
          xField: data.xField,
          yField: data.yField,
          seriesField: data.seriesField,
          dataFilter: (datum: any) => seriesNames.includes(datum.series),
        });
      });
    } else {
      spec.data = [
        {
          id: 'data',
          values: data.data,
        },
      ];

      spec.xField = data.xField;
      spec.yField = data.yField;
      spec.seriesField = data.seriesField;
    }
    const isHorizontal = _config.chartOrientation === 'horizontal';
    let xAxisConfig, yAxisConfig;

    if (isHorizontal) {
      //x为数值，y为分类
      xAxisConfig = {
        orient: 'bottom',
        type: 'linear',
        title: {
          visible: !!data.yAxis?.title,
          text: data.yAxis?.title ?? '',
        },
        min: data.yAxis?.min,
        max: data.yAxis?.max,
      };
      yAxisConfig = {
        orient: 'left',
        type: data.xAxis?.type === 'linear' ? 'linear' : 'band',
        title: {
          visible: !!data.xAxis?.title,
          text: data.xAxis?.title ?? '',
        },
        ...(data.xAxis?.type === 'linear' && {
          min: data.xAxis?.min,
          max: data.xAxis?.max,
        }),
      };
    } else {
      // 垂直图表：x为分类，y轴为数值
      xAxisConfig = {
        orient: 'bottom',
        type: data.xAxis?.type === 'linear' ? 'linear' : 'band',
        title: {
          visible: !!data.xAxis?.title,
          text: data.xAxis?.title ?? '',
        },
        ...(data.xAxis?.type === 'linear' && {
          min: data.xAxis?.min,
          max: data.xAxis?.max,
        }),
      };
      yAxisConfig = {
        orient: 'left',
        type: 'linear',
        title: {
          visible: !!data.yAxis?.title,
          text: data.yAxis?.title ?? '',
        },
        min: data.yAxis?.min,
        max: data.yAxis?.max,
      };
    }

    spec.axes = [xAxisConfig, yAxisConfig];

    // 标题
    if (data.title) {
      spec.title = {
        visible: true,
        text: data.title,
        align: 'center',
      };
    }

    // 图例
    spec.legends = [
      {
        visible: data.plots.length > 1,
        orient: 'top',
        position: 'end',
      },
    ];

    // 交互
    spec.crosshair = {
      xField: { visible: true },
      yField: { visible: true },
    };

    log.debug('VChart spec for XY chart:', spec);
    return spec;
  }

  /**
   * 应用主题到VChart配置
   */
  protected applyTheme(spec: any, themeVariables: any): any {
    const colors = [
      themeVariables.primaryColor || '#ff6b6b',
      themeVariables.secondaryColor || '#4ecdc4',
      themeVariables.tertiaryColor || '#45b7d1',
      themeVariables.primaryBorderColor || '#96ceb4',
      themeVariables.secondaryBorderColor || '#feca57',
    ];

    return {
      ...spec,
      color: colors,
      background: themeVariables.background ?? '#ffffff',
      theme: {
        fontFamily: themeVariables.fontFamily ?? 'Arial, sans-serif',
      },
    };
  }
}

/**
 * 使用VChart渲染xy图表的函数
 */
export const drawWithVChart: DrawDefinition = async (text, id, _version, diagObj) => {
  log.debug('Rendering XY chart with VChart');

  const db = diagObj.db as typeof XYChartDB;
  const config = db.getChartConfig();

  const renderer = new XYChartVChartRenderer();
  await renderer.render(text, id, _version, diagObj, config.width, config.height);
};
