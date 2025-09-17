import type { DrawDefinition } from '../../diagram-api/types.js';
import { getConfig } from '../../diagram-api/diagramAPI.js';
import { log } from '../../logger.js';
import { VChartRenderer } from '../../rendering-util/VChartRenderer.js';
import { cleanAndMerge } from '../../utils.js';

/**
 * 甘特图任务数据接口
 */
interface GanttTask {
  id: string;
  task: string;
  section: string;
  startTime: Date;
  endTime: Date;
  renderEndTime?: Date | null;
  active?: boolean;
  done?: boolean;
  crit?: boolean;
  milestone?: boolean;
  classes: string[];
  order: number;
}

/**
 * 甘特图数据库接口
 */
interface GanttDB {
  getTasks(): GanttTask[];
  getSections(): string[];
  getDiagramTitle(): string;
  getDateFormat(): string;
  getAxisFormat(): string;
  getTickInterval(): string;
  getConfig(): GanttConfig;
}

/**
 * 甘特图配置接口
 */
interface GanttConfig {
  useWidth?: number;
  renderer?: string;
  [key: string]: unknown;
}

/**
 * VChart甘特图数据项接口
 */
interface VChartGanttDataItem {
  id: string;
  name: string;
  section: string;
  start: number;
  end: number;
  duration: number;
  progress: number;
  type: string;
  row: number;
  order: number;
  classes: string[];
  taskName: string;
  startDate: number;
  endDate: number;
  group: string;
  status: string;
}

/**
 * 提取的甘特图数据接口
 */
interface ExtractedGanttData {
  tasks: VChartGanttDataItem[];
  sections: string[];
  title: string;
  dateFormat: string;
  axisFormat: string;
  tickInterval: string;
  config: GanttConfig;
}

/**
 * 时间轴刻度配置接口
 */
interface TimeAxisTick {
  count: number;
  unit: string;
}

/**
 * VChart规格接口
 */
interface VChartSpec {
  type: string;
  data: {
    id: string;
    values: VChartGanttDataItem[];
  }[];
  taskField: string;
  startField: string;
  endField: string;
  progressField: string;
  groupField: string;
  timeAxis: {
    orient: string;
    type: string;
    min: number;
    max: number;
    tick: TimeAxisTick;
    label: {
      formatMethod: (value: number) => string;
    };
  };
  groupAxis: {
    orient: string;
    type: string;
    domain: string[];
    tick: { visible: boolean };
    grid: {
      visible: boolean;
      style: { stroke: string; lineWidth: number };
    };
  };
  task: {
    style: {
      fill: (datum: VChartGanttDataItem) => string;
      stroke: string;
      strokeWidth: number;
      cornerRadius: number;
    };
    state: {
      hover: {
        stroke: string;
        strokeWidth: number;
      };
    };
  };
  progress: {
    visible: boolean;
    style: {
      fill: string;
      fillOpacity: number;
    };
  };
  milestone: {
    visible: boolean;
    style: {
      symbolType: string;
      size: number;
      fill: string;
      stroke: string;
      strokeWidth: number;
    };
  };
  label: {
    visible: boolean;
    position: string;
    style: {
      fontSize: number;
      fill: string;
      fontWeight: string;
    };
    formatMethod: (datum: VChartGanttDataItem) => string;
  };
  grid: {
    visible: boolean;
    style: {
      stroke: string;
      strokeOpacity: number;
    };
  };
  tooltip: {
    visible: boolean;
    mark: {
      content: {
        key: string;
        value: (datum: VChartGanttDataItem) => string;
      }[];
    };
  };
  animation: {
    appear: {
      duration: number;
      easing: string;
    };
    enter: {
      type: string;
      duration: number;
    };
  };
  interaction: {
    brush: {
      visible: boolean;
      brushType: string;
    };
    zoom: {
      visible: boolean;
      zoomType: string;
    };
  };
  title?: {
    visible: boolean;
    text: string;
    align: string;
    style: {
      fontSize: number;
      fontWeight: string;
      fontFamily?: string;
      [key: string]: unknown;
    };
  };
  background?: string;
}

/**
 * 主题变量接口
 */
interface ThemeVariables {
  fontFamily?: string;
  doneTaskBkgColor?: string;
  activeTaskBkgColor?: string;
  critBkgColor?: string;
  taskBkgColor?: string;
  gridColor?: string;
  background?: string;
}

/**
 * 甘特图VChart渲染器实现
 */
class GanttVChartRenderer extends VChartRenderer {
  /**
   * 从数据库提取甘特图数据
   */
  protected extractData(db: GanttDB): ExtractedGanttData {
    const tasks: GanttTask[] = db.getTasks();
    const sections: string[] = db.getSections();
    const title = db.getDiagramTitle();

    log.debug('Gantt chart data:', { tasks, sections, title });

    // 转换任务数据为VChart期望的格式
    const chartData = tasks.map((task) => {
      const startTime = new Date(task.startTime).getTime();
      const endTime = new Date(task.renderEndTime || task.endTime).getTime();
      const duration = endTime - startTime;

      return {
        id: task.id,
        name: task.task,
        section: task.section,
        start: startTime,
        end: endTime,
        duration: duration,
        progress: task.done ? 1 : task.active ? 0.5 : 0,
        type: this.getTaskType(task),
        row: this.getTaskRow(task, sections),
        order: task.order,
        classes: task.classes,
        // VChart甘特图需要的字段
        taskName: task.task,
        startDate: startTime,
        endDate: endTime,
        group: task.section,
        status: this.getTaskStatus(task),
      };
    });

    return {
      tasks: chartData,
      sections,
      title,
      dateFormat: db.getDateFormat(),
      axisFormat: db.getAxisFormat(),
      tickInterval: db.getTickInterval(),
      config: db.getConfig(),
    };
  }

  /**
   * 获取任务类型
   */
  private getTaskType(task: GanttTask): string {
    if (task.milestone) {
      return 'milestone';
    }
    if (task.crit) {
      return 'critical';
    }
    if (task.active) {
      return 'active';
    }
    if (task.done) {
      return 'done';
    }
    return 'normal';
  }

  /**
   * 获取任务状态
   */
  private getTaskStatus(task: GanttTask): string {
    if (task.done) {
      return 'done';
    }
    if (task.active) {
      return 'active';
    }
    if (task.crit) {
      return 'critical';
    }
    return 'normal';
  }

  /**
   * 获取任务所在行
   */
  private getTaskRow(task: GanttTask, sections: string[]): number {
    const sectionIndex = sections.indexOf(task.section);
    return sectionIndex >= 0 ? sectionIndex : 0;
  }

  /**
   * 创建VChart甘特图规格
   */
  protected createVChartSpec(data: ExtractedGanttData, _config: GanttConfig): VChartSpec {
    const { tasks, sections, title } = data;

    if (!tasks || tasks.length === 0) {
      log.warn('No tasks found for Gantt chart');
      return this.createEmptySpec() as VChartSpec;
    }

    // 计算时间范围
    const startTimes = tasks.map((task) => task.start);
    const endTimes = tasks.map((task) => task.end);
    const minTime = Math.min(...startTimes);
    const maxTime = Math.max(...endTimes);

    // 创建VChart甘特图规格
    const spec = {
      type: 'common',
      data: [
        {
          id: 'ganttData',
          values: tasks,
        },
      ],
      // 甘特图字段映射
      taskField: 'taskName',
      startField: 'startDate',
      endField: 'endDate',
      progressField: 'progress',
      groupField: 'group',

      // 时间轴配置
      timeAxis: {
        orient: 'bottom',
        type: 'time',
        min: minTime,
        max: maxTime,
        tick: this.createTimeAxisTick(data),
        label: {
          formatMethod: (value: number) => {
            return new Date(value).toLocaleDateString();
          },
        },
      },

      // 分组轴配置
      groupAxis: {
        orient: 'left',
        type: 'band',
        domain: sections,
        tick: {
          visible: false,
        },
        grid: {
          visible: true,
          style: {
            stroke: '#e8e8e8',
            lineWidth: 1,
          },
        },
      },

      // 任务条样式
      task: {
        style: {
          fill: (datum: VChartGanttDataItem) => this.getTaskColor(datum),
          stroke: '#fff',
          strokeWidth: 1,
          cornerRadius: 2,
        },
        state: {
          hover: {
            stroke: '#333',
            strokeWidth: 2,
          },
        },
      },

      // 进度条样式
      progress: {
        visible: true,
        style: {
          fill: '#4CAF50',
          fillOpacity: 0.8,
        },
      },

      // 里程碑样式
      milestone: {
        visible: true,
        style: {
          symbolType: 'diamond',
          size: 8,
          fill: '#FF9800',
          stroke: '#fff',
          strokeWidth: 2,
        },
      },

      // 标签配置
      label: {
        visible: true,
        position: 'inside',
        style: {
          fontSize: 12,
          fill: '#fff',
          fontWeight: 'normal',
        },
        formatMethod: (datum: VChartGanttDataItem) => {
          return datum.taskName;
        },
      },

      // 网格线配置
      grid: {
        visible: true,
        style: {
          stroke: '#e8e8e8',
          strokeOpacity: 0.5,
        },
      },

      // 工具提示
      tooltip: {
        visible: true,
        mark: {
          content: [
            {
              key: '任务',
              value: (datum: VChartGanttDataItem) => datum.taskName,
            },
            {
              key: '开始时间',
              value: (datum: VChartGanttDataItem) => new Date(datum.startDate).toLocaleDateString(),
            },
            {
              key: '结束时间',
              value: (datum: VChartGanttDataItem) => new Date(datum.endDate).toLocaleDateString(),
            },
            {
              key: '进度',
              value: (datum: VChartGanttDataItem) => `${Math.round(datum.progress * 100)}%`,
            },
            {
              key: '状态',
              value: (datum: VChartGanttDataItem) => datum.status,
            },
          ],
        },
      },

      // 动画配置
      animation: {
        appear: {
          duration: 1000,
          easing: 'cubicOut',
        },
        enter: {
          type: 'fadeIn',
          duration: 500,
        },
      },

      // 交互配置
      interaction: {
        brush: {
          visible: true,
          brushType: 'x',
        },
        zoom: {
          visible: true,
          zoomType: 'x',
        },
      },
    };

    // 添加标题
    if (title) {
      (spec as Record<string, unknown>).title = {
        visible: true,
        text: title,
        align: 'center',
        style: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      };
    }

    log.debug('Generated VChart Gantt spec:', spec);
    return spec;
  }

  /**
   * 创建时间轴刻度配置
   */
  private createTimeAxisTick(data: ExtractedGanttData): TimeAxisTick {
    const tickInterval = data.tickInterval;
    if (tickInterval) {
      // 解析tickInterval格式，如 "1day", "1week" 等
      const match = /^(\d+)(day|week|month|year)$/.exec(tickInterval);
      if (match) {
        const count = parseInt(match[1]);
        const unit = match[2];

        return {
          count,
          unit,
        };
      }
    }

    return {
      count: 1,
      unit: 'day',
    };
  }

  /**
   * 获取任务颜色
   */
  private getTaskColor(datum: VChartGanttDataItem): string {
    switch (datum.status) {
      case 'done':
        return '#4CAF50'; // 绿色
      case 'active':
        return '#2196F3'; // 蓝色
      case 'critical':
        return '#F44336'; // 红色
      default:
        return '#9E9E9E'; // 灰色
    }
  }

  /**
   * 创建空的图表规格
   */
  private createEmptySpec(): Partial<VChartSpec> {
    return {
      type: 'gantt',
      data: [
        {
          id: 'ganttData',
          values: [],
        },
      ],
      title: {
        visible: true,
        text: '无数据',
        align: 'center',
        style: {
          fontSize: 14,
          fontWeight: 'normal',
        },
      },
    };
  }

  /**
   * 应用mermaid主题到VChart
   */
  protected applyTheme(spec: VChartSpec, themeVariables: ThemeVariables): VChartSpec {
    if (!themeVariables) {
      return spec;
    }

    // 应用颜色主题
    const colorScheme = {
      done: themeVariables.doneTaskBkgColor || '#4CAF50',
      active: themeVariables.activeTaskBkgColor || '#2196F3',
      critical: themeVariables.critBkgColor || '#F44336',
      normal: themeVariables.taskBkgColor || '#9E9E9E',
    };

    // 更新任务样式
    spec.task = {
      ...spec.task,
      style: {
        ...spec.task?.style,
        fill: (datum: VChartGanttDataItem) =>
          colorScheme[datum.status as keyof typeof colorScheme] || colorScheme.normal,
      },
    };

    // 应用字体配置
    if (themeVariables.fontFamily) {
      spec.label = {
        ...spec.label,
        style: {
          ...spec.label?.style,
          fontFamily: themeVariables.fontFamily,
        } as typeof spec.label.style & { fontFamily?: string },
      };

      if (spec.title) {
        spec.title.style = {
          ...spec.title.style,
          fontFamily: themeVariables.fontFamily,
        } as typeof spec.title.style & { fontFamily?: string };
      }
    }

    // 应用网格颜色
    if (themeVariables.gridColor) {
      spec.grid = {
        ...spec.grid,
        style: {
          ...spec.grid?.style,
          stroke: themeVariables.gridColor,
        },
      };
    }

    // 应用背景色
    if (themeVariables.background) {
      spec.background = themeVariables.background;
    }

    return spec;
  }
}

/**
 * VChart甘特图绘制函数
 */
const drawWithVChart: DrawDefinition = async (text, id, _version, diagObj) => {
  log.debug('rendering gantt chart with VChart\n' + text);

  const db = diagObj.db;
  const globalConfig = getConfig();
  const ganttConfig = cleanAndMerge(db.getConfig ? db.getConfig() : {}, globalConfig.gantt || {});

  const renderer = new GanttVChartRenderer();

  try {
    // 设置图表尺寸
    const width = ganttConfig?.useWidth || 1200;
    const height = 600;

    // 渲染图表
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

    log.debug('Gantt chart rendered successfully with VChart');
  } catch (error) {
    log.error('Failed to render gantt chart with VChart:', error);
    throw error;
  } finally {
    renderer.dispose();
  }
};

export { drawWithVChart };
