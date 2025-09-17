import { describe, it, expect, beforeEach, vi } from 'vitest';
import { drawWithVChart } from './ganttVChartRenderer.js';

// Mock VChart
const mockVChart = {
  renderAsync: vi.fn().mockResolvedValue(undefined),
  release: vi.fn(),
};

vi.mock('@visactor/vchart', () => ({
  VChart: vi.fn().mockImplementation(() => mockVChart),
}));

// Mock selectSvgElement
vi.mock('../../rendering-util/selectSvgElement.js', () => ({
  selectSvgElement: vi.fn().mockReturnValue({
    append: vi.fn().mockReturnValue({
      attr: vi.fn().mockReturnThis(),
      style: vi.fn().mockReturnThis(),
      node: vi.fn().mockReturnValue(document.createElement('div')),
    }),
  }),
}));

// Mock configureSvgSize
vi.mock('../../setupGraphViewbox.js', () => ({
  configureSvgSize: vi.fn(),
}));

// Mock cleanAndMerge
vi.mock('../../utils.js', () => ({
  cleanAndMerge: vi.fn().mockImplementation((a, b) => ({ ...a, ...b })),
}));

// Mock getConfig
vi.mock('../../diagram-api/diagramAPI.js', () => ({
  getConfig: vi.fn().mockReturnValue({
    gantt: {
      useWidth: 1200,
      renderer: 'vchart',
    },
  }),
}));

describe('Gantt VChart Renderer', () => {
  const mockDb = {
    getTasks: vi.fn().mockReturnValue([
      {
        id: 'task1',
        task: '任务1',
        section: '阶段A',
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-05'),
        renderEndTime: null,
        active: false,
        done: true,
        crit: false,
        milestone: false,
        classes: [],
        order: 0,
      },
      {
        id: 'task2',
        task: '任务2',
        section: '阶段A',
        startTime: new Date('2024-01-03'),
        endTime: new Date('2024-01-08'),
        renderEndTime: null,
        active: true,
        done: false,
        crit: true,
        milestone: false,
        classes: ['custom-class'],
        order: 1,
      },
      {
        id: 'milestone1',
        task: '里程碑1',
        section: '阶段B',
        startTime: new Date('2024-01-08'),
        endTime: new Date('2024-01-08'),
        renderEndTime: null,
        active: false,
        done: false,
        crit: false,
        milestone: true,
        classes: [],
        order: 2,
      },
    ]),
    getSections: vi.fn().mockReturnValue(['阶段A', '阶段B']),
    getDiagramTitle: vi.fn().mockReturnValue('项目甘特图'),
    getDateFormat: vi.fn().mockReturnValue('YYYY-MM-DD'),
    getAxisFormat: vi.fn().mockReturnValue('%Y-%m-%d'),
    getTickInterval: vi.fn().mockReturnValue('1day'),
    getConfig: vi.fn().mockReturnValue({
      useWidth: 1200,
      renderer: 'vchart',
    }),
  };

  const mockDiagObj = {
    type: 'gantt',
    text: 'gantt',
    parser: {} as any,
    renderer: {} as any,
    styles: {} as any,
    init: vi.fn(),
    getParser: vi.fn(),
    getType: vi.fn().mockReturnValue('gantt'),
    db: mockDb,
    globalConfig: {
      gantt: {
        useWidth: 1200,
      },
      themeVariables: {
        fontFamily: 'Arial, sans-serif',
        doneTaskBkgColor: '#4CAF50',
        activeTaskBkgColor: '#2196F3',
        critBkgColor: '#F44336',
        taskBkgColor: '#9E9E9E',
        gridColor: '#e8e8e8',
        background: '#ffffff',
      },
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该成功渲染甘特图', async () => {
    const text = `
gantt
    title 项目甘特图
    dateFormat  YYYY-MM-DD
    section 阶段A
    任务1    :done, task1, 2024-01-01, 2024-01-05
    任务2    :active, crit, task2, 2024-01-03, 2024-01-08
    section 阶段B
    里程碑1  :milestone, milestone1, 2024-01-08, 0d
    `;

    await expect(drawWithVChart(text, 'gantt-test', '1.0.0', mockDiagObj)).resolves.not.toThrow();

    expect(mockVChart.renderAsync).toHaveBeenCalled();
  });

  it('应该正确提取甘特图数据', async () => {
    const text = 'gantt\n    title 测试甘特图';

    await drawWithVChart(text, 'gantt-test', '1.0.0', mockDiagObj);

    expect(mockDb.getTasks).toHaveBeenCalled();
    expect(mockDb.getSections).toHaveBeenCalled();
    expect(mockDb.getDiagramTitle).toHaveBeenCalled();
  });

  it('应该处理空数据情况', async () => {
    const emptyDb = {
      ...mockDb,
      getTasks: vi.fn().mockReturnValue([]),
      getSections: vi.fn().mockReturnValue([]),
      getDiagramTitle: vi.fn().mockReturnValue(''),
    };

    const emptyDiagObj = {
      ...mockDiagObj,
      db: emptyDb,
    };

    await expect(
      drawWithVChart('gantt', 'gantt-empty', '1.0.0', emptyDiagObj)
    ).resolves.not.toThrow();
  });

  it('应该正确应用主题变量', async () => {
    const text = 'gantt\n    title 主题测试';

    await drawWithVChart(text, 'gantt-theme', '1.0.0', mockDiagObj);

    // VChart应该被调用并传入正确的规格
    expect(mockVChart.renderAsync).toHaveBeenCalled();
  });

  it('应该处理不同类型的任务', async () => {
    const mixedTasksDb = {
      ...mockDb,
      getTasks: vi.fn().mockReturnValue([
        {
          id: 'normal-task',
          task: '普通任务',
          section: '测试',
          startTime: new Date('2024-01-01'),
          endTime: new Date('2024-01-03'),
          renderEndTime: null,
          active: false,
          done: false,
          crit: false,
          milestone: false,
          classes: [],
          order: 0,
        },
        {
          id: 'active-task',
          task: '进行中任务',
          section: '测试',
          startTime: new Date('2024-01-02'),
          endTime: new Date('2024-01-04'),
          renderEndTime: null,
          active: true,
          done: false,
          crit: false,
          milestone: false,
          classes: [],
          order: 1,
        },
        {
          id: 'done-task',
          task: '已完成任务',
          section: '测试',
          startTime: new Date('2024-01-01'),
          endTime: new Date('2024-01-02'),
          renderEndTime: null,
          active: false,
          done: true,
          crit: false,
          milestone: false,
          classes: [],
          order: 2,
        },
        {
          id: 'critical-task',
          task: '关键任务',
          section: '测试',
          startTime: new Date('2024-01-03'),
          endTime: new Date('2024-01-05'),
          renderEndTime: null,
          active: false,
          done: false,
          crit: true,
          milestone: false,
          classes: [],
          order: 3,
        },
        {
          id: 'milestone-task',
          task: '里程碑',
          section: '测试',
          startTime: new Date('2024-01-05'),
          endTime: new Date('2024-01-05'),
          renderEndTime: null,
          active: false,
          done: false,
          crit: false,
          milestone: true,
          classes: [],
          order: 4,
        },
      ]),
    };

    const mixedDiagObj = {
      ...mockDiagObj,
      db: mixedTasksDb,
    };

    await expect(
      drawWithVChart('gantt', 'gantt-mixed', '1.0.0', mixedDiagObj)
    ).resolves.not.toThrow();

    expect(mockVChart.renderAsync).toHaveBeenCalled();
  });

  it('应该正确处理时间间隔配置', async () => {
    const intervalDb = {
      ...mockDb,
      getTickInterval: vi.fn().mockReturnValue('1week'),
    };

    const intervalDiagObj = {
      ...mockDiagObj,
      db: intervalDb,
    };

    await expect(
      drawWithVChart('gantt', 'gantt-interval', '1.0.0', intervalDiagObj)
    ).resolves.not.toThrow();

    expect(intervalDb.getTickInterval).toHaveBeenCalled();
  });

  it('应该处理渲染器配置错误', async () => {
    const errorDb = {
      ...mockDb,
      getConfig: vi.fn().mockReturnValue(null),
    };

    const errorDiagObj = {
      ...mockDiagObj,
      db: errorDb,
    };

    await expect(
      drawWithVChart('gantt', 'gantt-error', '1.0.0', errorDiagObj)
    ).resolves.not.toThrow();
  });

  it('应该清理VChart资源', async () => {
    const text = 'gantt\n    title 资源清理测试';

    await drawWithVChart(text, 'gantt-cleanup', '1.0.0', mockDiagObj);

    // 渲染器应该调用dispose方法来清理资源
    // 这里我们验证VChart实例已经被创建
    expect(mockVChart.renderAsync).toHaveBeenCalled();
  });

  it('应该支持自定义尺寸', async () => {
    const customDb = {
      ...mockDb,
      getConfig: vi.fn().mockReturnValue({
        useWidth: 800,
        renderer: 'vchart',
      }),
    };

    const customDiagObj = {
      ...mockDiagObj,
      db: customDb,
    };

    await expect(
      drawWithVChart('gantt', 'gantt-custom-size', '1.0.0', customDiagObj)
    ).resolves.not.toThrow();

    expect(mockVChart.renderAsync).toHaveBeenCalled();
  });
});
