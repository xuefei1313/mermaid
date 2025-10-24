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
    log.debug('Plots count:', xyChartData?.plots?.length);
    log.debug('Plots data:', xyChartData?.plots);

    if (!xyChartData?.plots?.length) {
      log.warn('No plot data found for XY chart');
      return {
        data: [],
        xField: 'category',
        yField: 'value',
        type: 'line',
        chartType: 'line',
        plots: [],
        xAxis: { type: 'band', title: '', categories: [] },
        yAxis: { type: 'linear', title: '', min: 0, max: 100 },
        title: '',
      };
    }

    const transformedData: any[] = [];

    // 处理每个层的数据，转换为VChart期望的格式
    xyChartData.plots.forEach((plot: any, plotIndex: number) => {
      plot.data.forEach((dataPoint: any) => {
        const [xValue, yValue] = dataPoint;
        transformedData.push({
          category: xValue,
          value: yValue,
          series: `Series ${plotIndex + 1}`,
          type: plot.type, // 'line' 或 'bar'
        });
      });
    });

    const chartType = this.determineChartType(xyChartData);
    log.debug('Determined chart type:', chartType);

    return {
      data: transformedData,
      xField: 'category',
      yField: 'value',
      seriesField: 'series',
      chartType: chartType,
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

    log.debug('Plot types found:', [...plotTypes]);
    log.debug('Number of plot types:', plotTypes.size);

    if (plotTypes.size > 1) {
      log.debug('Multiple plot types detected, using common chart type');
      return 'common'; // VChart组合图表
    }

    // 单一类型图表
    const firstPlotType = xyChartData.plots[0]?.type;
    log.debug('Single plot type detected:', firstPlotType);
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
      // 单一类型图表的数据格式
      const chartData = data.data.map((item: any) => ({
        category: item.category,
        value: item.value,
      }));

      spec.data = [
        {
          id: 'data',
          values: chartData,
        },
      ];

      spec.xField = data.xField;
      spec.yField = data.yField;
      if (data.plots.length > 1) {
        spec.seriesField = data.seriesField;
      }
    }
    const isHorizontal = _config.chartOrientation === 'horizontal';
    let xAxisConfig, yAxisConfig;

    if (isHorizontal) {
      // 水平图表：x为数值轴，y为分类轴
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
        type: 'band',
        title: {
          visible: !!data.xAxis?.title,
          text: data.xAxis?.title ?? '',
        },
      };
    } else {
      // 垂直图表：x为分类/线性轴，y为数值轴
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
    log.debug('Final chart type:', spec.type);
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

    const themedSpec = {
      ...spec,
      color: colors,
      theme: {
        fontFamily: themeVariables.fontFamily ?? 'Arial, sans-serif',
      },
    };

    // 应用背景色
    if (themeVariables.backgroundColor) {
      themedSpec.background = themeVariables.backgroundColor;
    }

    // 应用标题样式
    if (themedSpec.title && themeVariables.titleColor) {
      themedSpec.title = {
        ...themedSpec.title,
        style: {
          text: {
            fill: themeVariables.titleColor,
          },
        },
      };
    }

    return themedSpec;
  }
}

/**
 * 使用VChart渲染xy图表的函数
 */
export const drawWithVChart: DrawDefinition = async (text, id, _version, diagObj) => {
  log.debug('Rendering XY chart with VChart');

  const db = diagObj.db as typeof XYChartDB;
  const config = db.getChartConfig();

  // 扩展 diagObj 以包含主题变量和重写getConfig方法
  const extendedDiagObj = {
    ...diagObj,
    globalConfig: {
      themeVariables: db.getChartThemeConfig(),
    },
    db: {
      ...db,
      getConfig: () => config, // 确保基类使用正确的配置
    },
  };

  const renderer = new XYChartVChartRenderer();
  await renderer.render(text, id, _version, extendedDiagObj, config.width, config.height);
};
