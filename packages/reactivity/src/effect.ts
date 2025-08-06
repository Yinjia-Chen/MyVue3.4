export function effect(fn, options?) {
  // 创建一个响应式 effect   数据变化后可以重新执行


  // 创建一个 effect，只要依赖的属性变化了就要执行回调
  const _effect = new ReactiveEffect(fn, () => {
    // scheduler
    _effect.run()
  })
  // 默认执行一次
  _effect.run()
}

export let activeEffect; // 导出全局 effect 先默认为undefined

class ReactiveEffect {
  public active = true; // 创建的 effect 默认是响应式的
  // fn 用户编写的函数
  // scheduler 如果 fn 中依赖的数据发生变化后，需要重新调用 -> run()
  constructor(public fn, public scheduler) { }
  run() {
    // 让 fn 执行
    if (!this.active) {
      return this.fn() // 未激活时 执行后什么都不做
    }
    let lastEffect = activeEffect // 发生嵌套时，当前实例是外层 effect ，用 lastEffect 保存外层 effect 实例
    try {
      activeEffect = this
      return this.fn() // 依赖收集 -> state.name state.version
    } finally { // 执行完内层 effect
      activeEffect = lastEffect // 将当前实例重新指向回外层 effect
    }
  }
}