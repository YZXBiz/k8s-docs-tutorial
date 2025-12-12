import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  guideSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Part I: Fundamentals',
      collapsible: true,
      collapsed: false,
      items: [
        'kubernetes-primer',
        'kubernetes-principles',
        'getting-kubernetes',
      ],
    },
    {
      type: 'category',
      label: 'Part II: Core Concepts',
      collapsible: true,
      collapsed: false,
      items: [
        'working-with-pods',
        'virtual-clusters-namespaces',
        'kubernetes-deployments',
        'kubernetes-services',
        'ingress',
      ],
    },
    {
      type: 'category',
      label: 'Part III: Advanced Features',
      collapsible: true,
      collapsed: false,
      items: [
        'wasm-on-kubernetes',
        'service-discovery',
        'kubernetes-storage',
        'configmaps-secrets',
        'statefulsets',
      ],
    },
    {
      type: 'category',
      label: 'Part IV: Security and API',
      collapsible: true,
      collapsed: false,
      items: [
        'api-security-rbac',
        'kubernetes-api',
        'threat-modeling',
        'real-world-security',
      ],
    },
  ],
};

export default sidebars;
