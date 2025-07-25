// 这个文件会帮我们打包 packages 下的模块，最终打包出js文件


// node dev.js (要打包的名字 -f 打包的格式) === argv

import minimist from "minimist"

// node 中的命令行参数通过 process 来获取 process.argv
const args = minimist(process.argv.slice(2))

console.log(args);