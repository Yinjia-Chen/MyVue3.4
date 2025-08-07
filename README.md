# Vue 深入学习：手写 Vue 3.4 源码

## 1. 文件说明：

- pnpm-workspace.yaml：PNPM 工作区配置文件，形成 monorepo 结构的关键，用于管理 monorepo 下的子包，运行 `pnpm install` 时会在子包间建立本地依赖链接 ，例：其他包中的 `index.ts` 可以通过 `import {...} from "@vue/shared";` 拿到 `shared/index.js` 导出的方法
- .npmrc：PNPM 的配置文件，可自定义依赖安装时的扁平化策略（如 `shamefully-flatten`）、镜像源等安装行
- dev.js：配置 `npm run dev` 默认node环境下执行的文件，用于打包 packages 下的文件，最终打包出 js 文件

------

## 2. 环境搭建：

### 2.1. monorepo 开发环境搭建

1. minimist：Node.js 参数处理模块
2. `package.json/"scripts": { "dev": "node dev.js 要打包的名字 -f 打包的格式" }`
   1. argv = 要打包的名字 -f 打包的格式
   2. -f 打包格式 -> --format esm(or cjs) 决定打包输出的模块格式是 esm 还是 cjs
   3. `const args = minimist(process.argv.slice(2))`可以获取 argv
   4. `const target = args._[0] || 'reactivity'` 打包哪个项目
   5. `const format = args.f || 'iife'` 打包后的模块化规范  iife：立即调用函数

3. node 中 esm模块没有 __dirname 来表示当前文件的绝对路径

   1. `const __filename = fileURLToPath(import.meta.url)` 获取当前文件的绝对路径
      - `import.meta.url` 是 esm 中以 file:// 开头的绝对路径，要联合 fileURLToPath 使用
   2. `const __dirname = dirname(__filename)` 获取当前文件所在目录的绝对路径

4. resolve 用于 esm 执行路径拼接

5. reactivity/src/package.json 配置：

   ```json
   {
     "name": "@vue/reactivity",            // 包的名称，发布到 npm/私服后通过此标识安装
     "version": "1.0.0",                    // 当前包的版本号，遵循 SemVer 规范
     "module": "dist/reactivity.esm-bundler.js", // 指定 ESM 格式的入口，用于打包工具（如 Rollup、Webpack）引用
     "unpkg": "dist/reactivity.global.js",  // 指定在 CDN（如 unpkg）上发布时的入口文件，一般为 UMD/Global 格式
     "buildOptions": {                      // 自定义构建选项，构建脚本会读取此字段来决定输出内容
       "name": "VueReactivity",             // UMD/Global 模式下，挂载到全局变量的名称（window.VueReactivity）
       "formats": [                         // 指定要输出的模块格式列表
         "esm-bundler",   // 针对打包工具（Rollup/Webpack）打包使用的 ES Module
         "esm-browser",   // 浏览器原生支持的 ES Module
         "cjs",           // Node.js 环境下的 CommonJS 模块
         "global"         // IIFE/UMD 格式，直接通过 <script> 引入，全局挂载
       ]
     }
   }
   ```

6. `import {...} from "..."` 静态引入                          `import()` 异步函数动态引入，返回promise

7. `pnpm install @vue/shared --workspace --filter @vue/reactivity` 将本地workspace的shared安装到reactivity

------

### 2.2 搭建 esbuild 开发环境

1. script/dev.js

   ```javascript
   import esbuild from "esbuild";
   esbuild.context({
     entryPoints: [entry], // 入口
     outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`), // 出口
     bundle: true, // 例：reactivity依赖shared，会一起打包
     platform: 'browser', // 打包后给浏览器使用
     sourcemap: true, // 可以调试源代码
     // format: format
     format, // cjs esm iife
     // 当 format 是 iife 时，必须提供，用于给打包产物起名，随后可以用此属性名访问到打包产物
     globalName: pkg.buildOptions?.name, 
   }).then((ctx) => {
     console.log("start dev");
     return ctx.watch(); // 监控入口文件持续进行打包
   })
   ```

2. `pnpm run dev`        若需要修改 打包的模块 或 打包的格式 在 YOUR_PROJECT_ROOT/package.json 下修改

------

## 3. 源码实现：

> 先 pnpm run dev 启动打包，确保打包内容实时更新再写

### 3.1 reactivity / reactive

> 说明：核心API，创建响应式对象
>
> 设计点：
>
> 1. 统一检查：是否是对象，不是对象直接返回
> 2. 响应式设计：给对象做劫持代理，添加 get / set
> 3. 实现缓存（性能优化）：设计 WeakMap，防止内存泄漏，劫持前检查缓存表，存在直接返回
> 4. 重复代理（性能优化）：在 get 中维护一个 IS_REACTIVE 属性，访问该属性，未代理对象返回 undefined 跳过，已代理对象访问时触发 get ，访问到该属性返回 true，表示属性存在，意味着已经代理过，直接返回

1. 统一检查：是否是对象，不是对象直接返回

   ```typescript
   if (!isObject(target)) {
     return target;
   }
   ```

2. 响应式设计：给对象做劫持代理，添加 get / set

   ```typescript
   // 对象代理做劫持
   let proxy = new Proxy(target, mutableHandlers)
   const mutableHandlers: ProxyHandler<any> = {
     get(target, key, receiver){
     },
     set(target, key, value, receiver) {
       return true
     }
   }
   ```

   >`Proxy(obj, handler)` JS ES6 原生 API 用于实现对象的劫持（代理）
   >```typescript
   >Proxy(target, handler)
   >// target: 要劫持的对象
   >// handler: 一个对象，固定了 trap (陷阱) 函数
   >const handler: ProxyHandler<any> = {
   > get(target, propKey, receiver){};
   > set(target, propKey, value, receiver){};
   >    // target: 被代理的原始对象
   >    // propKey: 当前访问/设置的属性名
   >    // receiver: 触发本次 get/set 操作的对象
   >}
   >```

3. 实现缓存（性能优化）：设计 WeakMap，防止内存泄漏，劫持前检查缓存表，存在直接返回

   ```typescript
   const reactiveMap = new WeakMap()
   // 根据对象缓存 代理后的结果
   reactiveMap.set(target,proxy)
   // 取缓存，如果已缓存，直接返回
   const existProxy = reactiveMap.get(target);
   if (existProxy) {
     return existProxy
   }
   ```

4. 重复代理（性能优化）：在 get 中维护一个 IS_REACTIVE 属性，访问该属性，未代理对象返回 undefined 跳过，已代理对象访问时触发 get ，访问到该属性返回 true，表示属性存在，意味着已经代理过，直接返回

   ```typescript
   // 创建一个枚举，标记是否是响应式（已代理）
   enum ReactiveFlags {
     IS_REACTIVE = '__v_isReactive'
   }
   
   get(target, key, receiver) {
     // 如果访问到对象上有 IS_REACTIVUE 返回true
     if (key === ReactiveFlags.IS_REACTIVE) {
       return true
     }
   },
     
   // 触发get，如果已经代理过，直接返回
   if (target[ReactiveFlags.IS_REACTIVE]) {
     return target;
   }
   ```

6. 

------

### 3.2 reactivity / effect

> 说明：副作用（如渲染、计算、watch 回调等），默认执行一次收集依赖，后续对应的响应式状态变化时自动重新执行
>
> 设计点：
>
> 1. 默认立即执行：创建 effect 时，自动执行一次回调，完成首次依赖收集
> 2. 全局 activeEffect：导出模块级变量 activeEffect，用于在 run 中标记“当前正在执行”的 effect，依赖收集阶段读取，从而把对应 effect 注册到依赖集合
> 3. 嵌套 effect 支持：使用 lastEffect 保存外层 effect 实例，执行完内层后重新将保存的lastEffect赋值给 activeEffect

1. 默认立即执行：创建 effect 时，自动执行一次回调，完成首次依赖收集

    ```typescript
    export function effect(fn, options?){
       // 创建一个 effect，只要依赖的属性变化了就要执行回调
      const _effect = new ReactiveEffect(fn, () => {
        // scheduler
        _effect.run()
      })
      // 默认执行一次
      _effect.run()
    }
    ```

2. 全局 activeEffect：导出模块级变量 activeEffect，用于在 run 中标记“当前正在执行”的 effect，依赖收集阶段读取，从而把对应 effect 注册到依赖集合

    ```typescript
    export let activeEffect; // 导出全局 effect 先默认为undefined
    class ReactiveEffect {
      ...
      run() {
        ...
        activeEffect = this; // 第一次执行时 将 activeEffect 指向当前实例 获取“当前正在执行”的 effect
        ...
      }
      ...
    }
    ```

3. 嵌套 effect 支持：使用 lastEffect 保存外层 effect 实例，执行完内层 effect 后重新将保存的 lastEffect 赋值给 activeEffect

    ```typescript
    class ReactiveEffect {
      ...
      run() {
        let lastEffect = activeEffect; // 发生嵌套时，当前实例是外层 effect ，用 lastEffect 保存外层 effect 实例
        try {
          activeEffect = this; // 将当前实例指向 this，也就是内层 effect
          ...
        } finally { // 执行完内层 effect
          activeEffect = lastEffect; // 将当前实例重新指向回外层 effect
        }
    		...
      }
    }
    ```

4. 
