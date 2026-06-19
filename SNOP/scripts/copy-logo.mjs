import { copyFileSync, existsSync } from 'fs'

const src = 'C:/Users/49379479/.cursor/projects/c-Users-49379479-SNOP-2/assets/c__Users_49379479_AppData_Roaming_Cursor_User_workspaceStorage_5195175aac4f3d1953a3d374d1f32c1e_images_Logo_Snop-8a5cd9e2-95a9-4358-ab86-f8de0bf33ade.png'
const dest = new URL('../public/logo.png', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

copyFileSync(src, dest)
console.log(existsSync(dest) ? 'logo ok' : 'logo fail')
