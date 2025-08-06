import { activeEffect } from "./effect";
import { track } from "./reactiveEffect";

// 创建一个枚举，标记是否是响应式（已代理）
export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

// Proxy 的参数2：包含 trap 函数的对象
export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    // receiver：代理后的响应式对象
    // 如果访问到对象上有 IS_REACTIVUE 返回true
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    // 当取值的时候 应该让响应式属性 和 effect 映射起来

    // 依赖收集 todo...

    track(target,key) // 收集target对象上的key属性，和effect关联在一起
    // console.log(activeEffect,key);

    // return target[key] // 如果 target 中有函数用到 this，this指向targer 而不是receiver, 此时访问属性不拦截
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    // 找到属性 让对应的 effect 重新执行

    // 触发更新 todo...
    return Reflect.set(target,key,value,receiver)
  }
}