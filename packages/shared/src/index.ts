// shared:公共工具库，把多个包都要用到的通用逻辑提取封装，保持代码 DRY 不重复，降低耦合

export function isObject(value) {
  // typeof null === object
  return typeof value === 'object' && value !== null
}