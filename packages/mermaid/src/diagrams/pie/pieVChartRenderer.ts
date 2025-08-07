import type { PieDiagramConfig } from '../../config.type.js';
import { getConfig } from '../../diagram-api/diagramAPI.js';
import type { DrawDefinition } from '../../diagram-api/types.js';
import { log } from '../../logger.js';
import { cleanAndMerge } from '../../utils.js';
import { VChartRenderer } from '../../rendering-util/VChartRenderer.js';
import type { PieDB, Sections, D3Section } from './pieTypes.js';

/**
 * 饼图的VChart渲染器实现
 */
class PieVChartRenderer extends VChartRenderer {
  /**
   * 从数据库提取饼图数据
   */
  protected extractData(db: PieDB): D3Section[] {
    const sections: Sections = db.getSections();
    return [...sections.entries()].map(([label, value]) => ({
      label,
      value,
    }));
  }

  /**
   * 创建VChart饼图规格
   */
  protected createVChartSpec(data: D3Section[], _config: Required<PieDiagramConfig>): any {
    return {
      type: 'pie',
      data: [
        {
          id: 'pieData',
          values: data,
        },
      ],
      outerRadius: 0.8,
      innerRadius: 0,
      padAngle: 0,
      categoryField: 'label',
      valueField: 'value',
      seriesField: 'label',
      pie: {
        style: {
          stroke: '#fff',
          strokeWidth: 2,
        },
      },
      label: {
        visible: true,
        position: 'outside',
        style: {
          fontWeight: 'normal',
        },
        formatMethod: (text: string, datum: any) => {
          const total = data.reduce((sum, item) => sum + item.value, 0);
          const percentage = ((datum.value / total) * 100).toFixed(0);
          return `${percentage}%`;
        },
      },
      tooltip: {
        mark: {
          content: [
            {
              key: (datum: any) => datum.label,
              value: (datum: any) => datum.value,
            },
          ],
        },
      },
      legends: {
        visible: true,
        orient: 'right',
        position: 'middle',
        item: {
          shape: {
            style: {
              symbolType: 'rect',
            },
          },
        },
      },
      animation: {
        appear: {
          duration: 1000,
          easing: 'bounceOut',
        },
        enter: {
          type: 'growAngleIn',
        },
      },
    };
  }

  /**
   * 应用mermaid主题到VChart
   */
  protected applyTheme(spec: any, themeVariables: any): any {
    if (!themeVariables) {
      return spec;
    }

    // 应用颜色主题
    const colorScheme = [
      themeVariables.pie1,
      themeVariables.pie2,
      themeVariables.pie3,
      themeVariables.pie4,
      themeVariables.pie5,
      themeVariables.pie6,
      themeVariables.pie7,
      themeVariables.pie8,
      themeVariables.pie9,
      themeVariables.pie10,
      themeVariables.pie11,
      themeVariables.pie12,
    ].filter(Boolean);

    if (colorScheme.length > 0) {
      spec.color = colorScheme;
    }

    // 应用字体配置
    if (themeVariables.fontFamily) {
      spec.label = {
        ...spec.label,
        style: {
          ...spec.label?.style,
          fontFamily: themeVariables.fontFamily,
        },
      };

      spec.legends = {
        ...spec.legends,
        item: {
          ...spec.legends?.item,
          label: {
            style: {
              fontFamily: themeVariables.fontFamily,
            },
          },
        },
      };
    }

    // 应用标题样式
    if (themeVariables.pieTitleTextColor || themeVariables.pieTitleTextSize) {
      spec.title = {
        visible: true,
        style: {
          fill: themeVariables.pieTitleTextColor,
          fontSize: themeVariables.pieTitleTextSize,
          fontFamily: themeVariables.fontFamily,
        },
      };
    }

    return spec;
  }
}

/**
 * VChart饼图绘制函数
 */
const drawWithVChart: DrawDefinition = async (text, id, _version, diagObj) => {
  log.debug('rendering pie chart with VChart\n' + text);

  const db = diagObj.db as PieDB;
  const globalConfig = getConfig();
  const _pieConfig: Required<PieDiagramConfig> = cleanAndMerge(db.getConfig(), globalConfig.pie);

  const renderer = new PieVChartRenderer();

  try {
    // 设置图表尺寸
    const width = 600;
    const height = 450;

    // 直接调用渲染方法
    await renderer.render(
      text,
      id,
      _version,
      {
        ...diagObj,
        globalConfig,
      },
      width,
      height
    );

    // 添加标题
    const title = db.getDiagramTitle();
    if (title) {
      // 标题将通过VChart的title配置显示
      log.debug(`Pie chart title: ${title}`);
    }
  } catch (error) {
    log.error('Failed to render pie chart with VChart:', error);
    throw error;
  } finally {
    renderer.dispose();
  }
};

export { drawWithVChart };
