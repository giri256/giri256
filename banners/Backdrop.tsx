import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C} from './theme';

// Deep background: drifting colour fields, a dot grid, and a vignette.
// `tint` colours the main field so the whole frame takes on the colour of what's on screen.
export const Backdrop: React.FC<{tint?: string; energy?: number}> = ({tint = C.merged, energy = 1}) => {
	const frame = useCurrentFrame();
	const t = frame / 30;
	const blob = (x: number, y: number, r: number, color: string, alpha: number, phase: number): React.CSSProperties => ({
		position: 'absolute',
		left: x + Math.sin(t * 0.5 + phase) * 40 - r,
		top: y + Math.cos(t * 0.4 + phase) * 30 - r,
		width: r * 2,
		height: r * 2,
		borderRadius: '50%',
		background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
		opacity: alpha * energy,
	});
	return (
		<AbsoluteFill style={{backgroundColor: C.bg, overflow: 'hidden'}}>
			<div style={blob(960, 260, 460, tint, 0.3, 0)} />
			<div style={blob(260, 600, 460, C.blue, 0.12, 2)} />
			<div style={blob(700, 680, 360, C.merged, 0.1, 4)} />
			<AbsoluteFill
				style={{
					backgroundImage: 'radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1.2px)',
					backgroundSize: '26px 26px',
					backgroundPosition: `${-t * 4}px ${-t * 2}px`,
				}}
			/>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.65) 100%)'}} />
			<AbsoluteFill style={{border: `1px solid ${C.border}`, borderRadius: 20}} />
		</AbsoluteFill>
	);
};
