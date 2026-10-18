// out/<name>.mp4 -> assets/<name>.webp (full colour, so glows and gradients survive).
// Plays once, then holds the final frame.
import {execFileSync} from 'node:child_process';

for (const name of process.argv.slice(2)) {
	execFileSync(
		'ffmpeg',
		['-loglevel', 'error', '-y', '-i', `out/${name}.mp4`, '-vf', 'fps=30', '-c:v', 'libwebp_anim', '-quality', '78', '-compression_level', '6', '-loop', '1', `assets/${name}.webp`],
		{stdio: 'inherit'},
	);
}
