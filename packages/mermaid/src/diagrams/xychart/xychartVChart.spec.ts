import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawWithVChart } from './xychartVChartRenderer.js';
import type { Diagram } from '../../Diagram.js';

// Mock VChart
const mockVChart = {
  renderTo: vi.fn(),
  renderAsync: vi.fn().mockResolvedValue(undefined),
  updateSpec: vi.fn(),
  release: vi.fn(),
};

vi.mock('@visactor/vchart', () => ({
  VChart: vi.fn(() => mockVChart),
  registerTheme: vi.fn(),
}));

// Mock selectSvgElement
vi.mock('../../rendering-util/selectSvgElement.js', () => ({
  selectSvgElement: vi.fn(() => ({
    node: () => ({
      appendChild: vi.fn(),
      setAttribute: vi.fn(),
    }),
    attr: vi.fn().mockReturnThis(),
    append: vi.fn(() => ({
      attr: vi.fn().mockReturnThis(),
      style: vi.fn().mockReturnThis(),
      append: vi.fn(() => ({
        attr: vi.fn().mockReturnThis(),
        style: vi.fn().mockReturnThis(),
        node: () => document.createElement('div'),
      })),
      node: () => document.createElement('div'),
    })),
    selectAll: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
  })),
}));

// Mock configureSvgSize
vi.mock('../../setupGraphViewbox.js', () => ({
  configureSvgSize: vi.fn(),
}));

// Mock logger
vi.mock('../../logger.js', () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock XYChartDB
const mockXYChartDB = {
  getConfig: vi.fn(() => ({
    renderer: 'vchart',
    width: 700,
    height: 500,
    titleFontSize: 20,
    titlePadding: 10,
    showTitle: true,
    showDataLabel: false,
    chartOrientation: 'vertical',
    plotReservedSpacePercent: 50,
    xAxis: {
      showLabel: true,
      labelFontSize: 14,
      labelPadding: 5,
      showTitle: true,
      titleFontSize: 16,
      titlePadding: 5,
      showTick: true,
      tickLength: 5,
      tickWidth: 2,
      showAxisLine: true,
      axisLineWidth: 2,
    },
    yAxis: {
      showLabel: true,
      labelFontSize: 14,
      labelPadding: 5,
      showTitle: true,
      titleFontSize: 16,
      titlePadding: 5,
      showTick: true,
      tickLength: 5,
      tickWidth: 2,
      showAxisLine: true,
      axisLineWidth: 2,
    },
  })),
  getChartThemeConfig: vi.fn(() => ({
    backgroundColor: '#ffffff',
    titleColor: '#000000',
    xAxisLabelColor: '#666666',
    xAxisTitleColor: '#000000',
    xAxisTickColor: '#cccccc',
    xAxisLineColor: '#cccccc',
    yAxisLabelColor: '#666666',
    yAxisTitleColor: '#000000',
    yAxisTickColor: '#cccccc',
    yAxisLineColor: '#cccccc',
    plotColorPalette: '#1f77b4,#ff7f0e,#2ca02c,#d62728',
  })),
  getChartConfig: vi.fn(() => ({
    width: 700,
    height: 500,
    titleFontSize: 20,
    titlePadding: 10,
    showTitle: true,
    showDataLabel: false,
    chartOrientation: 'vertical',
    plotReservedSpacePercent: 50,
    renderer: 'vchart',
    xAxis: {
      showLabel: true,
      labelFontSize: 14,
      labelPadding: 5,
      showTitle: true,
      titleFontSize: 16,
      titlePadding: 5,
      showTick: true,
      tickLength: 5,
      tickWidth: 2,
      showAxisLine: true,
      axisLineWidth: 2,
    },
    yAxis: {
      showLabel: true,
      labelFontSize: 14,
      labelPadding: 5,
      showTitle: true,
      titleFontSize: 16,
      titlePadding: 5,
      showTick: true,
      tickLength: 5,
      tickWidth: 2,
      showAxisLine: true,
      axisLineWidth: 2,
    },
  })),
  getXYChartData: vi.fn(() => ({
    title: 'Test XY Chart',
    xAxis: {
      type: 'band',
      title: 'X Axis',
      categories: ['A', 'B', 'C', 'D'],
    },
    yAxis: {
      type: 'linear',
      title: 'Y Axis',
      min: 0,
      max: 100,
    },
    plots: [
      {
        type: 'bar',
        fill: '#1f77b4',
        data: [
          ['A', 10],
          ['B', 20],
          ['C', 30],
          ['D', 40],
        ],
      },
      {
        type: 'line',
        strokeFill: '#ff7f0e',
        strokeWidth: 2,
        data: [
          ['A', 15],
          ['B', 25],
          ['C', 35],
          ['D', 45],
        ],
      },
    ],
  })),
};

describe('XYChart VChart Renderer', () => {
  let mockDiagram: Diagram;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDiagram = {
      db: mockXYChartDB,
    } as unknown as Diagram;
  });

  it('should render bar chart with VChart', async () => {
    // Mock data for bar chart only
    mockXYChartDB.getXYChartData.mockReturnValue({
      title: 'Bar Chart Test',
      xAxis: {
        type: 'band',
        title: 'Categories',
        categories: ['A', 'B', 'C'],
      },
      yAxis: {
        type: 'linear',
        title: 'Values',
        min: 0,
        max: 50,
      },
      plots: [
        {
          type: 'bar',
          fill: '#1f77b4',
          data: [
            ['A', 10],
            ['B', 30],
            ['C', 20],
          ],
        },
      ],
    });

    await drawWithVChart('test text', 'test-id', '1.0.0', mockDiagram);

    expect(mockVChart.renderAsync).toHaveBeenCalled();

    // Get the VChart constructor call to check the spec
    const { VChart } = await import('@visactor/vchart');
    const vchartCalls = (VChart as any).mock.calls;
    expect(vchartCalls.length).toBeGreaterThan(0);

    const spec = vchartCalls[0][0];
    expect(spec.type).toBe('bar');
    expect(spec.data).toBeDefined();
    expect(spec.data[0].values).toEqual([
      { category: 'A', value: 10 },
      { category: 'B', value: 30 },
      { category: 'C', value: 20 },
    ]);
  });

  it('should render line chart with VChart', async () => {
    // Mock data for line chart only
    mockXYChartDB.getXYChartData.mockReturnValue({
      title: 'Line Chart Test',
      xAxis: {
        type: 'band',
        title: 'Time',
        categories: ['Jan', 'Feb', 'Mar'],
      },
      yAxis: {
        type: 'linear',
        title: 'Temperature',
        min: 0,
        max: 30,
      },
      plots: [
        {
          type: 'line',
          strokeFill: '#ff7f0e',
          strokeWidth: 2,
          data: [
            ['Jan', 5],
            ['Feb', 15],
            ['Mar', 25],
          ],
        },
      ],
    });

    await drawWithVChart('test text', 'test-id', '1.0.0', mockDiagram);

    expect(mockVChart.renderAsync).toHaveBeenCalled();

    // Check the VChart spec for line chart
    const { VChart } = await import('@visactor/vchart');
    const vchartCalls = (VChart as any).mock.calls;
    const spec = vchartCalls[0][0];

    expect(spec.type).toBe('line');
    expect(spec.data[0].values).toEqual([
      { category: 'Jan', value: 5 },
      { category: 'Feb', value: 15 },
      { category: 'Mar', value: 25 },
    ]);
  });

  it('should render combination chart with VChart', async () => {
    // Use default mock data with both bar and line plots
    await drawWithVChart('test text', 'test-id', '1.0.0', mockDiagram);

    expect(mockVChart.renderAsync).toHaveBeenCalled();

    // Check the VChart spec for combination chart
    const { VChart } = await import('@visactor/vchart');
    const vchartCalls = (VChart as any).mock.calls;
    const spec = vchartCalls[0][0];

    expect(spec.type).toBe('common');
    expect(spec.series).toHaveLength(2);
    expect(spec.series[0].type).toBe('bar');
    expect(spec.series[1].type).toBe('line');
  });

  it('should apply theme colors correctly', async () => {
    mockXYChartDB.getChartThemeConfig.mockReturnValue({
      backgroundColor: '#f5f5f5',
      titleColor: '#333333',
      xAxisLabelColor: '#555555',
      xAxisTitleColor: '#333333',
      xAxisTickColor: '#cccccc',
      xAxisLineColor: '#cccccc',
      yAxisLabelColor: '#555555',
      yAxisTitleColor: '#333333',
      yAxisTickColor: '#cccccc',
      yAxisLineColor: '#cccccc',
      plotColorPalette: '#e74c3c,#3498db,#2ecc71',
    });

    await drawWithVChart('test text', 'test-id', '1.0.0', mockDiagram);

    const { VChart } = await import('@visactor/vchart');
    const vchartCalls = (VChart as any).mock.calls;
    const spec = vchartCalls[0][0];

    // Check theme application
    expect(spec.background).toBe('#f5f5f5');
    expect(spec.title?.style?.text?.fill).toBe('#333333');
  });

  it('should handle linear x-axis', async () => {
    // Mock data with linear x-axis
    mockXYChartDB.getXYChartData.mockReturnValue({
      title: 'Linear X-Axis Test',
      xAxis: {
        type: 'linear',
        title: 'Time (hours)',
        min: 0,
        max: 24,
      } as any,
      yAxis: {
        type: 'linear',
        title: 'Temperature',
        min: 0,
        max: 30,
      },
      plots: [
        {
          type: 'line',
          strokeFill: '#ff7f0e',
          strokeWidth: 2,
          data: [
            ['0', 10],
            ['6', 15],
            ['12', 25],
            ['18', 20],
            ['24', 12],
          ],
        },
      ],
    });

    await drawWithVChart('test text', 'test-id', '1.0.0', mockDiagram);

    const { VChart } = await import('@visactor/vchart');
    const vchartCalls = (VChart as any).mock.calls;
    const spec = vchartCalls[0][0];

    // Check linear x-axis configuration
    expect(spec.axes).toBeDefined();
    const xAxis = spec.axes.find((axis: any) => axis.orient === 'bottom');
    expect(xAxis?.type).toBe('linear');
    expect(xAxis?.min).toBe(0);
    expect(xAxis?.max).toBe(24);
  });

  it('should handle horizontal orientation', async () => {
    mockXYChartDB.getChartConfig.mockReturnValue({
      ...mockXYChartDB.getChartConfig(),
      chartOrientation: 'horizontal',
    });

    await drawWithVChart('test text', 'test-id', '1.0.0', mockDiagram);

    const { VChart } = await import('@visactor/vchart');
    const vchartCalls = (VChart as any).mock.calls;
    const spec = vchartCalls[0][0];

    // For horizontal charts, x and y should be swapped
    const xAxis = spec.axes?.find((axis: any) => axis.orient === 'bottom');
    const yAxis = spec.axes?.find((axis: any) => axis.orient === 'left');

    // In horizontal orientation, categories should be on y-axis
    expect(yAxis?.type).toBe('band');
    expect(xAxis?.type).toBe('linear');
  });

  it('should configure chart dimensions correctly', async () => {
    mockXYChartDB.getChartConfig.mockReturnValue({
      ...mockXYChartDB.getChartConfig(),
      width: 800,
      height: 600,
    });

    await drawWithVChart('test text', 'test-id', '1.0.0', mockDiagram);

    const { VChart } = await import('@visactor/vchart');
    const vchartCalls = (VChart as any).mock.calls;
    const spec = vchartCalls[0][0];

    expect(spec.width).toBe(800);
    expect(spec.height).toBe(600);
  });

  it('should handle empty data gracefully', async () => {
    mockXYChartDB.getXYChartData.mockReturnValue({
      title: 'Empty Chart',
      xAxis: {
        type: 'band',
        title: 'X Axis',
        categories: [],
      },
      yAxis: {
        type: 'linear',
        title: 'Y Axis',
        min: 0,
        max: 100,
      },
      plots: [],
    });

    await drawWithVChart('test text', 'test-id', '1.0.0', mockDiagram);

    // Should not throw and VChart should still be called
    expect(mockVChart.renderAsync).toHaveBeenCalled();
  });

  it('should handle completely undefined data gracefully', async () => {
    mockXYChartDB.getXYChartData.mockReturnValue(null as any);

    // Should not throw even with undefined data
    await expect(
      drawWithVChart('test text', 'test-id', '1.0.0', mockDiagram)
    ).resolves.toBeUndefined();
  });
});
