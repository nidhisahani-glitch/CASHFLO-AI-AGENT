import React, { useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  Handle,
  Position
} from 'reactflow';
import type { Node, Edge, NodeTypes } from 'reactflow';
import 'reactflow/dist/style.css';
import { advancedEngine, type ExtractedRule } from './advancedEngine';

interface RuleGraphVisualizationProps {
  policyType?: 'accounts_payable' | 'procurement';
  executedRules?: ExtractedRule[];
  height?: number;
}

const DecisionNode = ({ data }: { data: { label: string; status?: string; rule_id?: string } }) => {
  let borderColor = '#6366f1';
  let bgColor = '#1e1b4b';
  
  if (data.status === 'passed') {
    borderColor = '#22c55e';
    bgColor = '#14532d';
  } else if (data.status === 'failed') {
    borderColor = '#ef4444';
    bgColor = '#7f1d1d';
  }

  return (
    <div style={{
      padding: '10px 15px',
      borderRadius: '8px',
      border: `2px solid ${borderColor}`,
      background: bgColor,
      color: '#fff',
      fontSize: '12px',
      minWidth: '150px',
      textAlign: 'center'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{data.rule_id || 'Rule'}</div>
      <div style={{ opacity: 0.8 }}>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#fff' }} />
    </div>
  );
};

const ActionNode = ({ data }: { data: { label: string } }) => (
  <div style={{
    padding: '10px 15px',
    borderRadius: '8px',
    border: '2px solid #f59e0b',
    background: '#78350f',
    color: '#fff',
    fontSize: '12px',
    minWidth: '120px',
    textAlign: 'center'
  }}>
    <Handle type="target" position={Position.Top} style={{ background: '#fff' }} />
    <div style={{ fontWeight: 600 }}>{data.label}</div>
    <Handle type="source" position={Position.Bottom} style={{ background: '#fff' }} />
  </div>
);

const StartEndNode = ({ data }: { data: { label: string; isStart?: boolean } }) => (
  <div style={{
    padding: '10px 20px',
    borderRadius: '20px',
    border: `2px solid ${data.isStart ? '#22c55e' : '#3b82f6'}`,
    background: data.isStart ? '#166534' : '#1e3a8a',
    color: '#fff',
    fontSize: '12px',
    textAlign: 'center'
  }}>
    {data.label}
  </div>
);

const nodeTypes: NodeTypes = {
  decision: DecisionNode as any,
  action: ActionNode as any,
  start: StartEndNode as any,
  end: StartEndNode as any
};

const RuleGraphInner: React.FC<{
  policyType: 'accounts_payable' | 'procurement';
  executedRules: ExtractedRule[];
  height: number;
}> = ({ policyType, executedRules, height }) => {
  const graph = useMemo(() => advancedEngine.generateRuleGraph(policyType), [policyType]);

  const initialNodes: Node[] = useMemo(() => {
    const ruleStatusMap = new Map(executedRules.map(r => [r.rule_id, r.passed ? 'passed' : 'failed']));

    return graph.nodes.map((node, index) => {
      const status = node.rule_id ? ruleStatusMap.get(node.rule_id) : undefined;
      
      return {
        id: node.id,
        type: node.type,
        position: getPosition(node.id, index, graph.nodes.length),
        data: { 
          label: node.label, 
          status,
          rule_id: node.rule_id 
        }
      };
    });
  }, [graph, executedRules]);

  const initialEdges: Edge[] = useMemo(() => {
    return graph.edges.map((edge, index) => ({
      id: `e-${index}`,
      source: edge.from,
      target: edge.to,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#6366f1', strokeWidth: 2 }
    }));
  }, [graph]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div style={{ height, borderRadius: '12px', overflow: 'hidden', border: '1px solid #374151', background: '#0f172a' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#374151" />
        <Controls />
        <MiniMap 
          nodeColor={(node: Node) => {
            if (node.data?.status === 'passed') return '#22c55e';
            if (node.data?.status === 'failed') return '#ef4444';
            return '#6366f1';
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
        />
        <Panel position="top-right" style={{ padding: '10px', background: 'rgba(0,0,0,0.7)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}>
          <div style={{ fontWeight: 600, marginBottom: '5px' }}>{policyType === 'accounts_payable' ? 'AP Policy' : 'Procurement Policy'}</div>
          <div>Nodes: {graph.nodes.length}</div>
          <div>Edges: {graph.edges.length}</div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const RuleGraphVisualization: React.FC<RuleGraphVisualizationProps> = ({
  policyType = 'accounts_payable',
  executedRules = [],
  height = 500
}) => {
  return (
    <div style={{ width: '100%', height }}>
      <RuleGraphInner 
        policyType={policyType} 
        executedRules={executedRules} 
        height={height} 
      />
    </div>
  );
};

function getPosition(nodeId: string, index: number, _totalNodes: number): { x: number; y: number } {
  const nodeMap: Record<string, { x: number; y: number }> = {
    'start': { x: 250, y: 0 },
    'validation': { x: 250, y: 80 },
    'po-matching': { x: 250, y: 160 },
    'grn-matching': { x: 250, y: 240 },
    'tax-compliance': { x: 250, y: 320 },
    'approval': { x: 250, y: 400 },
    'notifications': { x: 250, y: 480 },
    'digital': { x: 250, y: 560 },
    'end-approved': { x: 450, y: 600 },
    'end-flagged': { x: 250, y: 600 },
    'end-rejected': { x: 50, y: 600 }
  };

  if (nodeMap[nodeId]) {
    return nodeMap[nodeId];
  }

  if (nodeId.startsWith('rule-')) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return { x: 50 + col * 100, y: 150 + row * 30 };
  }

  const col = index % 2;
  const row = Math.floor(index / 2);
  return { x: 100 + col * 300, y: 80 + row * 80 };
}

export default RuleGraphVisualization;