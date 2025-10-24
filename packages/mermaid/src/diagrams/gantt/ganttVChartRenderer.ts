import type { DrawDefinition } from '../../diagram-api/types.js';
import { getConfig } from '../../diagram-api/diagramAPI.js';
import { log } from '../../logger.js';
import { cleanAndMerge } from '../../utils.js';
import { selectSvgElement } from '../../rendering-util/selectSvgElement.js';
import { configureSvgSize } from '../../setupGraphViewbox.js';

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
 * VTable甘特图数据项接口
 */
interface VTableGanttDataItem {
  id: string;
  taskName: string;
  section: string;
  startTime: string;
  endTime: string;
  duration: number;
  progress: number;
  type: string;
  order: number;
  classes: string[];
  status: string;
  done: boolean;
  active: boolean;
  crit: boolean;
  milestone: boolean;
}

/**
 * 提取的甘特图数据接口
 */
interface ExtractedGanttData {
  tasks: VTableGanttDataItem[];
  sections: string[];
  title: string;
  dateFormat: string;
  axisFormat: string;
  tickInterval: string;
  config: GanttConfig;
}

/**
 * VTable甘特图配置接口
 */
interface VTableGanttConfig {
  container?: string | HTMLElement;
  data: VTableGanttDataItem[];
  columns: {
    title: string;
    field: string;
    width?: number;
    style?: {
      color?: string;
      bgColor?: string;
      fontWeight?: string;
    };
  }[];
  timeLineHeader: {
    scales: {
      unit: 'day' | 'week' | 'month' | 'year';
      step: number;
      label: string;
    }[];
  };
  gantt: {
    taskField: string;
    startField: string;
    endField: string;
    progressField: string;
    groupField: string;
    style?: {
      taskBar?: {
        fill?: (datum: VTableGanttDataItem) => string;
        stroke?: string;
        strokeWidth?: number;
        cornerRadius?: number;
      };
      progressBar?: {
        fill?: string;
        fillOpacity?: number;
      };
      milestone?: {
        symbolType?: string;
        size?: number;
        fill?: string;
        stroke?: string;
        strokeWidth?: number;
      };
    };
  };
  title?: {
    visible: boolean;
    text: string;
    align: 'left' | 'center' | 'right';
    style?: {
      fontSize?: number;
      fontWeight?: string;
      fontFamily?: string;
      color?: string;
    };
  };
  theme?: {
    fontFamily?: string;
    colorScheme?: {
      done?: string;
      active?: string;
      critical?: string;
      normal?: string;
    };
  };
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
 * 甘特图VTable渲染器实现
 */
class GanttVTableRenderer {
  private gantt: unknown = null;
  private container: HTMLElement | null = null;
  /**
   * 从数据库提取甘特图数据
   */
  protected extractData(db: GanttDB): ExtractedGanttData {
    const tasks: GanttTask[] = db.getTasks();
    const sections: string[] = db.getSections();
    const title = db.getDiagramTitle();

    log.debug('Gantt chart data:', { tasks, sections, title });

    // 转换任务数据为VTable期望的格式
    const chartData = tasks.map((task) => {
      const startTime = new Date(task.startTime).toISOString().split('T')[0];
      const endTime = new Date(task.renderEndTime ?? task.endTime).toISOString().split('T')[0];
      const duration =
        new Date(task.renderEndTime ?? task.endTime).getTime() - new Date(task.startTime).getTime();

      return {
        id: task.id,
        taskName: task.task,
        section: task.section,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        progress: task.done ? 1 : task.active ? 0.5 : 0,
        type: this.getTaskType(task),
        order: task.order,
        classes: task.classes,
        status: this.getTaskStatus(task),
        done: task.done ?? false,
        active: task.active ?? false,
        crit: task.crit ?? false,
        milestone: task.milestone ?? false,
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
   * 初始化VTable容器
   */
  protected initContainer(id: string): HTMLElement {
    const svg = selectSvgElement(id);
    const svgNode = svg.node() as unknown as SVGElement | null;
    const parent = svgNode?.parentElement as HTMLElement | null;

    // 在 SVG 父容器中创建标准 HTML div，避免 foreignObject 导致的 appendChild 问题
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';

    // 将容器插入到 svg 之后，作为同级元素
    if (parent) {
      parent.insertBefore(container, svgNode?.nextSibling ?? null);
    } else {
      // 兜底：若未找到父元素，则附加到 body
      document.body.appendChild(container);
    }

    this.container = container;
    return container;
  }

  /**
   * 创建VTable甘特图配置
   */
  protected createVTableConfig(data: ExtractedGanttData, _config: GanttConfig): VTableGanttConfig {
    const { tasks, title } = data;

    if (!tasks || tasks.length === 0) {
      log.warn('No tasks found for Gantt chart');
      return this.createEmptyConfig();
    }

    // 创建VTable甘特图配置
    const config: VTableGanttConfig = {
      data: tasks,
      columns: [
        {
          title: '任务名称',
          field: 'taskName',
          width: 200,
          style: {
            fontWeight: 'bold',
          },
        },
        {
          title: '分组',
          field: 'section',
          width: 120,
        },
        {
          title: '开始时间',
          field: 'startTime',
          width: 120,
        },
        {
          title: '结束时间',
          field: 'endTime',
          width: 120,
        },
        {
          title: '进度',
          field: 'progress',
          width: 80,
        },
        {
          title: '状态',
          field: 'status',
          width: 80,
        },
      ],
      timeLineHeader: {
        scales: [
          { unit: 'day', step: 1, label: '日' },
          { unit: 'week', step: 1, label: '周' },
          { unit: 'month', step: 1, label: '月' },
        ],
      },
      gantt: {
        taskField: 'taskName',
        startField: 'startTime',
        endField: 'endTime',
        progressField: 'progress',
        groupField: 'section',
        style: {
          taskBar: {
            fill: (datum: VTableGanttDataItem) => this.getTaskColor(datum),
            stroke: '#fff',
            strokeWidth: 1,
            cornerRadius: 2,
          },
          progressBar: {
            fill: '#4CAF50',
            fillOpacity: 0.8,
          },
          milestone: {
            symbolType: 'diamond',
            size: 8,
            fill: '#FF9800',
            stroke: '#fff',
            strokeWidth: 2,
          },
        },
      },
    };

    // 添加标题
    if (title) {
      config.title = {
        visible: true,
        text: title,
        align: 'center',
        style: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      };
    }

    log.debug('Generated VTable Gantt config:', config);
    return config;
  }

  /**
   * 渲染VTable甘特图
   */
  protected async renderVTable(
    config: VTableGanttConfig,
    container: HTMLElement,
    width: number,
    height: number
  ): Promise<unknown> {
    try {
      // 动态导入VTable Gantt
      const { Gantt } = await import('@visactor/vtable-gantt');

      // 设置容器尺寸
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;

      // 创建VTable甘特图实例
      // VTable Gantt 构造函数期望第一个参数是容器元素，第二个参数是配置对象
      this.gantt = new Gantt(container, {
        ...config,
        width,
        height,
        timelineHeader: config.timeLineHeader,
      } as any);

      // 渲染甘特图（某些版本构造后即自动渲染，render 可能不存在）
      const maybeRender = (this.gantt as any)?.render;
      if (typeof maybeRender === 'function') {
        maybeRender.call(this.gantt);
      }

      log.debug('VTable Gantt rendered successfully');
      return this.gantt;
    } catch (error) {
      log.error('Failed to render VTable Gantt:', error);
      throw new Error(`VTable Gantt rendering failed: ${String(error)}`);
    }
  }

  /**
   * 获取任务颜色
   */
  private getTaskColor(datum: VTableGanttDataItem): string {
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
   * 创建空的甘特图配置
   */
  private createEmptyConfig(): VTableGanttConfig {
    return {
      data: [],
      columns: [
        {
          title: '任务名称',
          field: 'taskName',
          width: 200,
        },
      ],
      timeLineHeader: {
        scales: [{ unit: 'day', step: 1, label: '日' }],
      },
      gantt: {
        taskField: 'taskName',
        startField: 'startTime',
        endField: 'endTime',
        progressField: 'progress',
        groupField: 'section',
      },
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
   * 应用mermaid主题到VTable
   */
  protected applyTheme(
    config: VTableGanttConfig,
    themeVariables: ThemeVariables
  ): VTableGanttConfig {
    if (!themeVariables) {
      return config;
    }

    // 应用颜色主题
    const colorScheme = {
      done: themeVariables.doneTaskBkgColor ?? '#4CAF50',
      active: themeVariables.activeTaskBkgColor ?? '#2196F3',
      critical: themeVariables.critBkgColor ?? '#F44336',
      normal: themeVariables.taskBkgColor ?? '#9E9E9E',
    };

    // 更新任务条样式
    if (config.gantt?.style?.taskBar) {
      config.gantt.style.taskBar.fill = (datum: VTableGanttDataItem) =>
        colorScheme[datum.status as keyof typeof colorScheme] ?? colorScheme.normal;
    }

    // 应用字体配置
    if (themeVariables.fontFamily) {
      config.theme = {
        ...config.theme,
        fontFamily: themeVariables.fontFamily,
      };

      if (config.title) {
        config.title.style = {
          ...config.title.style,
          fontFamily: themeVariables.fontFamily,
        };
      }
    }

    // 应用主题颜色方案
    config.theme = {
      ...config.theme,
      colorScheme,
    };

    return config;
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    if (this.gantt) {
      (this.gantt as any).release?.();
      this.gantt = null;
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
    diagObj: unknown,
    width: number,
    height: number
  ): Promise<void> {
    log.debug(`Rendering ${this.constructor.name} with VTable\n${text}`);

    try {
      // 获取数据和配置
      const db = (diagObj as any).db;
      const config = db.getConfig();
      const data = this.extractData(db);

      // 创建VTable甘特图配置
      let ganttConfig = this.createVTableConfig(data, config);

      // 应用主题
      const { themeVariables } = (diagObj as any).globalConfig ?? {};
      if (themeVariables) {
        ganttConfig = this.applyTheme(ganttConfig, themeVariables);
      }

      // 初始化容器
      const container = this.initContainer(id);

      // 渲染甘特图
      await this.renderVTable(ganttConfig, container, width, height);

      // 配置SVG大小
      const svg = selectSvgElement(id);
      configureSvgSize(svg, height, width, config?.useMaxWidth);
    } catch (error) {
      log.error(`Failed to render ${this.constructor.name}:`, error);
      // 回退到错误状态或默认渲染器
      throw error;
    }
  }
}

/**
 * VTable甘特图绘制函数
 */
const drawWithVTable: DrawDefinition = async (text, id, _version, diagObj) => {
  log.debug('rendering gantt chart with VTable\n' + text);

  const db = diagObj.db;
  const globalConfig = getConfig();
  const ganttConfig = cleanAndMerge(db.getConfig ? db.getConfig() : {}, globalConfig.gantt ?? {});

  const renderer = new GanttVTableRenderer();

  try {
    // 设置图表尺寸
    const width = ganttConfig?.useWidth ?? 1200;
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

    log.debug('Gantt chart rendered successfully with VTable');
  } catch (error) {
    log.error('Failed to render gantt chart with VTable:', error);
    throw error;
  } finally {
    renderer.dispose();
  }
};

export { drawWithVTable };
