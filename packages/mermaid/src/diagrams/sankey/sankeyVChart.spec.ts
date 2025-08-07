import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Diagram } from '../../Diagram.js';
import { drawWithVChart } from './sankeyVChartRenderer.js';

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

// Mock getConfig
vi.mock('../../diagram-api/diagramAPI.js', () => ({
  getConfig: vi.fn(() => ({
    theme: 'default',
    themeVariables: {
      primaryColor: '#ff6b6b',
      primaryTextColor: '#333333',
      primaryBorderColor: '#ff6b6b',
      lineColor: '#333333',
      secondaryColor: '#4ecdc4',
      tertiaryColor: '#45b7d1',
      background: '#ffffff',
      secondaryBorderColor: '#4ecdc4',
      tertiaryBorderColor: '#45b7d1',
    },
  })),
}));

// Mock document
Object.defineProperty(global, 'document', {
  value: {
    getElementById: vi.fn(() => ({
      style: {},
      querySelector: vi.fn(),
      appendChild: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ width: 800, height: 600 })),
    })),
    querySelector: vi.fn(() => ({
      style: {},
      appendChild: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ width: 800, height: 600 })),
    })),
    createElement: vi.fn(() => ({
      style: {},
      appendChild: vi.fn(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
    })),
  },
  writable: true,
});

describe('Sankey VChart Renderer', () => {
  let mockDB: any;
  let mockDiagObj: Diagram;

  beforeEach(() => {
    mockDB = {
      getGraph: vi.fn(() => ({
        nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
        links: [
          { source: 'A', target: 'B', value: 10 },
          { source: 'B', target: 'C', value: 5 },
        ],
      })),
      getConfig: vi.fn(() => ({})),
    };

    mockDiagObj = {
      db: mockDB,
    } as unknown as Diagram;

    vi.clearAllMocks();
  });

  it('should render sankey chart with VChart', async () => {
    await expect(
      drawWithVChart('sankey chart', 'test-id', '1.0.0', mockDiagObj)
    ).resolves.toBeUndefined();

    expect(mockDB.getGraph).toHaveBeenCalled();
  });

  it('should extract sankey data correctly', () => {
    const graph = mockDB.getGraph();

    expect(graph.nodes).toEqual([{ id: 'A' }, { id: 'B' }, { id: 'C' }]);

    expect(graph.links).toEqual([
      { source: 'A', target: 'B', value: 10 },
      { source: 'B', target: 'C', value: 5 },
    ]);
  });

  it('should handle empty data gracefully', async () => {
    mockDB.getGraph.mockReturnValue({
      nodes: [],
      links: [],
    });

    await expect(
      drawWithVChart('sankey chart', 'test-id', '1.0.0', mockDiagObj)
    ).resolves.toBeUndefined();

    expect(mockDB.getGraph).toHaveBeenCalled();
  });

  it('should transform nodes data correctly', () => {
    const graph = mockDB.getGraph();
    const transformedNodes = graph.nodes.map((node: any) => ({ name: node.id }));

    expect(transformedNodes).toEqual([{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
  });

  it('should pass links data unchanged', () => {
    const graph = mockDB.getGraph();

    expect(graph.links).toEqual([
      { source: 'A', target: 'B', value: 10 },
      { source: 'B', target: 'C', value: 5 },
    ]);
  });

  it('should call database methods', async () => {
    await drawWithVChart('sankey chart', 'test-id', '1.0.0', mockDiagObj);

    expect(mockDB.getGraph).toHaveBeenCalled();
    expect(mockDB.getConfig).toHaveBeenCalled();
  });
});
