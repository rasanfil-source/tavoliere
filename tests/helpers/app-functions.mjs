import { readFile } from 'node:fs/promises';
export const appSource = (await readFile(new URL('../../prototypes/firebase-spark-pwa/public/app.js', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
export function functionSource(name) {
  const match = new RegExp('^(?:async )?function ' + name + '\\(', 'm').exec(appSource);
  if (!match) throw new Error('Function not found: ' + name);
  const closing = /\n\}(?=\n|$)/.exec(appSource.slice(match.index));
  const end = closing ? match.index + closing.index : -1;
  if (end === -1) throw new Error('Function end not found: ' + name);
  return appSource.slice(match.index, end + 2);
}
export function functions(names, dependencies = {}) {
  return new Function(...Object.keys(dependencies), names.map(functionSource).join('\n')
    + '\nreturn {' + names.join(',') + '};')(...Object.values(dependencies));
}
