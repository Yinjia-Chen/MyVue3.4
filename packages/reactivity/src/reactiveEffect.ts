import { activeEffect } from "./effect";


export function track(target, key) {
  // activeEffect 有这个属性 说明这个key是在effect中访问的，没有说明在effect中访问的，不用收集

  if (activeEffect) {
    console.log(key, activeEffect);
  }

}



// {
//   { name: 'myvue', version: '3.4' }: {
//     name: {
//       effect, effect
//     },
//     version: {
//       effect
//     }
//   }
// }