// 这个文件会帮我们打包 packages 下的模块，最终打包出js文件

// node dev.js (要打包的名字 -f 打包的格式) === argv

import { resolve, dirname } from "path";
import minimist from "minimist"; // 引入 node.js 参数处理模块
import { fileURLToPath } from "url";
import { createRequire } from "module";
import esbuild from "esbuild";
// node 中的命令行参数通过 process 来获取 process.argv
const args = minimist(process.argv.slice(2))

// esm 使用 cjs 变量
const __filename = fileURLToPath(import.meta.url) // 手动解析获取本文件的绝对路径 dev.js
const __dirname = dirname(__filename); // 获取本文件所在目录的绝对路径：scripts
const require = createRequire(import.meta.url) // 给dev.js生成一个作用域内的require
const target = args._[0] || 'reactivity'; // 需要打包的目标项目
const format = args.f || 'iife' // 打包后的模块化规范
// console.log(target, format);

// console.log(import.meta.url);
// console.log(__filename);
// console.log(__dirname);
// console.log(require);

// 入口文件 根据命令行提供的 target 解析
const entry = resolve(__dirname, `../packages/${target}/src/index.ts`)

// 根据需要进行打包


esbuild.context({
  entryPoints: [entry], // 入口
  outfile: resolve(__dirname, `../packages/dist/${target}.js`), // 出口
  bundle: true, // 例：reactivity依赖shared，会一起打包
  platform: 'browser', // 打包后给浏览器使用
  sourcemap: true, // 可以调试源代码
  // format: format
  format, // cjs or esm or iife
})