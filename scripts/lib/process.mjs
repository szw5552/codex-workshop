import { spawn } from 'node:child_process';

export function spawnFile(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const { input, ...spawnOptions } = options;
    const child = spawn(command, args, { ...spawnOptions, stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    if (input) child.stdin.end(input);
    child.stdout?.on('data', (chunk) => { stdout += chunk; });
    child.stderr?.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(' ')} failed with code ${code}\n${stderr}`));
    });
  });
}

export async function commandExists(command) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(command)) return false;
  try {
    await spawnFile('/bin/sh', ['-lc', `command -v ${command}`]);
    return true;
  } catch {
    return false;
  }
}
