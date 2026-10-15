// Usage: npm run hash-password            (prompts for the password)
//        echo -n 'secret' | npm run hash-password
import { createInterface } from 'node:readline/promises';
import { hashPassword } from '../src/lib/server/password.ts';

async function readPassword(): Promise<string> {
	if (!process.stdin.isTTY) {
		let input = '';
		for await (const chunk of process.stdin) input += chunk;
		return input.replace(/\r?\n$/, '');
	}
	const rl = createInterface({ input: process.stdin, output: process.stderr });
	const answer = await rl.question('Admin password: ');
	rl.close();
	return answer;
}

const password = await readPassword();
if (password.length < 12) {
	console.error('Password must be at least 12 characters long.');
	process.exit(1);
}
console.log(await hashPassword(password));
