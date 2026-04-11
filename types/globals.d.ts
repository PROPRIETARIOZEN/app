// Declaração para imports de CSS como side-effect (ex: import './globals.css')
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
