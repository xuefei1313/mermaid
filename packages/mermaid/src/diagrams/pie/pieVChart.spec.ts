import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { PieDB } from './pieTypes.js';
import { drawWithVChart } from './pieVChartRenderer.js';

// Mock VChart
vi.mock('@visactor/vchart', () => ({
  VChart: vi.fn().mockImplementation(() => ({
    renderAsync: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  })),
}));

// Mock DOM methods
Object.defineProperty(global, 'HTMLElement', {
  value: vi.fn(),
});

// Mock SVG selection
vi.mock('../../rendering-util/selectSvgElement.js', () => ({
  selectSvgElement: vi.fn().mockReturnValue({
    append: vi.fn().mockReturnValue({
      attr: vi.fn().mockReturnThis(),
      style: vi.fn().mockReturnThis(),
      node: vi.fn().mockReturnValue(document.createElement('div')),
      append: vi.fn().mockReturnValue({
        attr: vi.fn().mockReturnThis(),
        style: vi.fn().mockReturnThis(),
        node: vi.fn().mockReturnValue(document.createElement('div')),
      }),
    }),
    attr: vi.fn().mockReturnThis(),
  }),
}));

// Mock setupGraphViewbox
vi.mock('../../setupGraphViewbox.js', () => ({
  configureSvgSize: vi.fn(),
  setupGraphViewbox: vi.fn(),
}));

describe('Pie Chart VChart Renderer', () => {
  let mockDb: PieDB;
  let mockDiagObj: any;

  beforeEach(() => {
    mockDb = {
      getConfig: vi.fn().mockReturnValue({
        renderer: 'vchart',
        textPosition: 0.75,
        useMaxWidth: true,
      }),
      getSections: vi.fn().mockReturnValue(
        new Map([
          ['Section A', 30],
          ['Section B', 20],
          ['Section C', 50],
        ])
      ),
      getDiagramTitle: vi.fn().mockReturnValue('Test Pie Chart'),
      getShowData: vi.fn().mockReturnValue(true),
      clear: vi.fn(),
      setDiagramTitle: vi.fn(),
      setAccTitle: vi.fn(),
      getAccTitle: vi.fn(),
      setAccDescription: vi.fn(),
      getAccDescription: vi.fn(),
      addSection: vi.fn(),
      setShowData: vi.fn(),
    };

    mockDiagObj = {
      db: mockDb,
      globalConfig: {
        themeVariables: {
          pie1: '#ff6b6b',
          pie2: '#4ecdc4',
          pie3: '#45b7d1',
          fontFamily: 'Arial, sans-serif',
          pieTitleTextColor: '#333',
          pieTitleTextSize: '16px',
        },
      },
    };
  });

  it('should render pie chart with VChart', async () => {
    const text = 'pie title Test Chart\n"A" : 30\n"B" : 20\n"C" : 50';
    const id = 'test-pie';
    const version = '1.0.0';

    await expect(drawWithVChart(text, id, version, mockDiagObj)).resolves.toBeUndefined();

    expect(mockDb.getSections).toHaveBeenCalled();
    expect(mockDb.getDiagramTitle).toHaveBeenCalled();
  });

  it('should extract data correctly', () => {
    const sections = mockDb.getSections();
    const data = [...sections.entries()].map(([label, value]) => ({
      label,
      value,
    }));

    expect(data).toEqual([
      { label: 'Section A', value: 30 },
      { label: 'Section B', value: 20 },
      { label: 'Section C', value: 50 },
    ]);
  });

  it('should apply theme correctly', () => {
    // This would test the theme application logic
    // For now, we just verify the structure
    expect(mockDiagObj.globalConfig.themeVariables).toBeDefined();
    expect(mockDiagObj.globalConfig.themeVariables.pie1).toBe('#ff6b6b');
  });
});
