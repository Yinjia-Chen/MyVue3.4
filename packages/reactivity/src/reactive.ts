import { isObject } from "@vue/shared"

// 缓存表：用于记录代理后的结果，可以复用  WeakMap 防止内存泄漏
const reactiveMap = new WeakMap()
// 创建一个枚举，标记是否是响应式（已代理）
enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}
// reactive / shallowReactive
// Proxy 的参数2：包含 trap 函数的对象
const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    // 如果访问到对象上有 IS_REACTIVUE 返回true
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
  },
  set(target, key, value, receiver) {
    return true
  }
}

// 方法：创建响应式对象
function createReactiveObject(target) {
  // 如果不是对象，不做响应式处理
  if (!isObject(target)) {
    return target;
  }
  // 未代理返回undefined跳过，已代理访问任意属性都会触发 get，这里 get 该属性返回true，直接返回target
  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target;
  }
  // 取缓存，如果已缓存，直接返回
  const existProxy = reactiveMap.get(target);
  if (existProxy) {
    return existProxy
  }
  // 对象代理做劫持
  let proxy = new Proxy(target, mutableHandlers)
  // 根据对象缓存 代理后的结果
  reactiveMap.set(target,proxy)
  return proxy
}

// 暴露 reactive
export function reactive(target) {
  return createReactiveObject(target)
}