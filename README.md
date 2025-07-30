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

### 3.1 reactivity

