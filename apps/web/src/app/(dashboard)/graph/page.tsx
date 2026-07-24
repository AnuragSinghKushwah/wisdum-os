'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../lib/api-client';

interface GraphNode {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly weight: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly label: string;
}

interface GraphData {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

export default function GraphPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Load graph data
  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<GraphData>('/v1/graph');
        setData(res);
      } catch {
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  // Force-directed simulation logic inside canvas
  useEffect(() => {
    if (data === null || data.nodes.length === 0 || canvasRef.current === null) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;

    // Resize handler
    function resize() {
      if (canvasRef.current === null) return;
      const rect = canvasRef.current.parentElement?.getBoundingClientRect();
      canvasRef.current.width = rect?.width || 800;
      canvasRef.current.height = rect?.height || 500;
    }
    resize();
    window.addEventListener('resize', resize);

    // Initialize node positions and velocities
    const nodes = data.nodes.map((node) => ({
      ...node,
      x: node.x ?? Math.random() * canvas.width,
      y: node.y ?? Math.random() * canvas.height,
      vx: node.vx ?? 0,
      vy: node.vy ?? 0,
    })) as GraphNode[];

    const edges = data.edges;

    let dragNode: GraphNode | null = null;
    let isDragging = false;

    // Mouse handlers
    function handleMouseDown(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Find clicked node
      for (const node of nodes) {
        const dx = (node.x || 0) - mouseX;
        const dy = (node.y || 0) - mouseY;
        const radius = 8 + (node.weight || 1) * 1.5;
        if (dx * dx + dy * dy < radius * radius) {
          dragNode = node;
          isDragging = true;
          setSelectedNode(node);
          break;
        }
      }
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDragging && dragNode !== null) {
        dragNode.x = mouseX;
        dragNode.y = mouseY;
        dragNode.vx = 0;
        dragNode.vy = 0;
        return;
      }

      // Check hover
      let foundHover: GraphNode | null = null;
      for (const node of nodes) {
        const dx = (node.x || 0) - mouseX;
        const dy = (node.y || 0) - mouseY;
        const radius = 8 + (node.weight || 1) * 1.5;
        if (dx * dx + dy * dy < radius * radius) {
          foundHover = node;
          break;
        }
      }
      setHoveredNode(foundHover);
    }

    function handleMouseUp() {
      isDragging = false;
      dragNode = null;
    }

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    let animationFrameId: number;

    // Physics Loop
    function step() {
      if (ctx === null || canvasRef.current === null) return;
      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark/light background
      ctx.clearRect(0, 0, width, height);

      // Force logic (Charge, Attraction, Gravity)
      const chargeStrength = 180;
      const linkStrength = 0.05;
      const centerStrength = 0.02;

      // Center force / Gravity
      for (const n of nodes) {
        if (n === dragNode) continue;
        n.vx = (n.vx || 0) + (width / 2 - (n.x || 0)) * centerStrength;
        n.vy = (n.vy || 0) + (height / 2 - (n.y || 0)) * centerStrength;
      }

      // Repulsion between all nodes (Charge)
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = (n2.x || 0) - (n1.x || 0);
          const dy = (n2.y || 0) - (n1.y || 0);
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);

          if (dist < 200) {
            const force = (chargeStrength / distSq) * 10;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (n1 !== dragNode) {
              n1.vx = (n1.vx || 0) - fx;
              n1.vy = (n1.vy || 0) - fy;
            }
            if (n2 !== dragNode) {
              n2.vx = (n2.vx || 0) + fx;
              n2.vy = (n2.vy || 0) + fy;
            }
          }
        }
      }

      // Attraction along edges (Link force)
      for (const edge of edges) {
        const n1 = nodes.find((n) => n.id === edge.source);
        const n2 = nodes.find((n) => n.id === edge.target);
        if (n1 === undefined || n2 === undefined) continue;

        const dx = (n2.x || 0) - (n1.x || 0);
        const dy = (n2.y || 0) - (n1.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;

        const force = (dist - 120) * linkStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (n1 !== dragNode) {
          n1.vx = (n1.vx || 0) + fx;
          n1.vy = (n1.vy || 0) + fy;
        }
        if (n2 !== dragNode) {
          n2.vx = (n2.vx || 0) - fx;
          n2.vy = (n2.vy || 0) - fy;
        }
      }

      // Update positions and velocities
      const damping = 0.85;
      for (const n of nodes) {
        if (n === dragNode) continue;
        n.x = (n.x || 0) + (n.vx || 0);
        n.y = (n.y || 0) + (n.vy || 0);
        n.vx = (n.vx || 0) * damping;
        n.vy = (n.vy || 0) * damping;

        // Keep inside bounds
        const radius = 8 + (n.weight || 1) * 1.5;
        n.x = Math.max(radius, Math.min(width - radius, n.x));
        n.y = Math.max(radius, Math.min(height - radius, n.y));
      }

      // 1. Draw Edges
      for (const edge of edges) {
        const n1 = nodes.find((n) => n.id === edge.source);
        const n2 = nodes.find((n) => n.id === edge.target);
        if (n1 === undefined || n2 === undefined) continue;

        ctx.beginPath();
        ctx.moveTo(n1.x || 0, n1.y || 0);
        ctx.lineTo(n2.x || 0, n2.y || 0);
        ctx.strokeStyle = '#e5e7eb25'; // very light gray in light mode, dark mode handled
        if (document.documentElement.classList.contains('dark')) {
          ctx.strokeStyle = '#37415160';
        }
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw edge label in middle
        const midX = ((n1.x || 0) + (n2.x || 0)) / 2;
        const midY = ((n1.y || 0) + (n2.y || 0)) / 2;
        ctx.fillStyle = '#9ca3af';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(edge.label, midX, midY);
      }

      // 2. Draw Nodes
      for (const n of nodes) {
        const radius = 8 + (n.weight || 1) * 1.5;
        ctx.beginPath();
        ctx.arc(n.x || 0, n.y || 0, radius, 0, 2 * Math.PI);

        // Core colors
        const isHovered = hoveredNode?.id === n.id;
        const isSelected = selectedNode?.id === n.id;

        if (isSelected) {
          ctx.fillStyle = '#f59e0b'; // Amber-500
          ctx.strokeStyle = '#f59e0b30';
          ctx.lineWidth = 6;
          ctx.stroke();
        } else if (isHovered) {
          ctx.fillStyle = '#d97706'; // Amber-600
          ctx.strokeStyle = '#d9770620';
          ctx.lineWidth = 4;
          ctx.stroke();
        } else {
          ctx.fillStyle = '#f59e0b20'; // glass-like amber
          ctx.strokeStyle = '#f59e0b80';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.fill();

        // Label
        ctx.fillStyle = '#111827';
        if (document.documentElement.classList.contains('dark')) {
          ctx.fillStyle = '#f9fafb';
        }
        ctx.font = isSelected ? 'bold 11px Inter' : '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x || 0, (n.y || 0) + radius + 14);
      }

      animationFrameId = requestAnimationFrame(step);
    }
    step();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [data, hoveredNode, selectedNode]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Panel */}
      <div className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Knowledge Graph</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xl leading-relaxed">
          Visual map of concepts, relationships, and patterns Wisdum has discovered in your knowledge base.
        </p>
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center text-neutral-400 text-sm font-semibold">
          Loading graph model...
        </div>
      ) : data === null || data.nodes.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center border border-dashed border-neutral-250 dark:border-neutral-800 rounded-2xl bg-white/40 dark:bg-neutral-950/20">
          <span className="text-4xl">🕸️</span>
          <p className="mt-4 text-sm font-bold text-neutral-800 dark:text-neutral-200">No concept nodes yet</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs text-center leading-relaxed">
            Add knowledge assets under the Knowledge tab and trigger a reasoning scan to build your conceptual map.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visualizer Canvas */}
          <div className="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm relative overflow-hidden h-[500px]">
            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full cursor-grab active:cursor-grabbing" />
            <div className="absolute bottom-4 left-4 text-[10px] font-mono text-neutral-400 bg-white/80 dark:bg-neutral-950/80 backdrop-blur px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 pointer-events-none shadow-sm">
              💡 Drag nodes to reposition • Click to inspect
            </div>
          </div>

          {/* Node detail side panel */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white/40 dark:border-neutral-800/80 dark:bg-neutral-950/20 p-6 shadow-sm space-y-4 h-[500px] overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider text-[9px] font-bold">
                    Concept Node
                  </span>
                  <h3 className="text-lg font-bold text-neutral-950 dark:text-white pt-1">{selectedNode.label}</h3>
                </div>
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Mention Count</span>
                  <p className="mt-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{selectedNode.weight} times in source assets</p>
                </div>
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Node ID</span>
                  <p className="mt-1 text-[11px] font-mono text-neutral-500 break-all">{selectedNode.id}</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400">
                <span className="text-2xl mb-2">🔍</span>
                <p className="text-xs font-semibold text-neutral-500">Select a node in the graph map to inspect its conceptual properties.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
