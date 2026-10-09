// Vaqtinchalik joy bosuvchi — navbatdagi vazifalarda haqiqiy view bilan almashtiriladi.
export function stubView(title){
  return function mount(root){
    root.innerHTML = `<div class="empty">${title} — tez orada (qurilmoqda)</div>`
    return function cleanup(){}
  }
}
