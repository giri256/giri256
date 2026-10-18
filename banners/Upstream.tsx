import React from 'react';
import {AbsoluteFill, Easing, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop} from './Backdrop';
import {C, ease, LANG, MERGE_PATH, mono, sans, UpstreamCard, UpstreamProps, W} from './theme';

// Score: a git graph draws down the left; each famous project's PR branches off, lands as a card,
// and merges back with a purple flash. A pulse then runs down the main line.
const ROW0 = 160;
const ROW = 82;
const LINE_X = 84;
const BRANCH_X = 120;
const rowStart = (i: number) => 26 + i * 20;
export const upstreamFrames = (n: number) => rowStart(n) + 150;

const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'});

const MergeIcon: React.FC<{size: number; color: string}> = ({size, color}) => (
	<svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
		<path d={MERGE_PATH} />
	</svg>
);

const DiffBar: React.FC<{add: number; del: number}> = ({add, del}) => {
	const green = add + del ? Math.round((5 * add) / (add + del)) : 0;
	return (
		<div style={{display: 'flex', alignItems: 'center', gap: 8, fontFamily: mono, fontSize: 14}}>
			<span style={{color: C.green}}>+{add}</span>
			<span style={{color: C.red}}>−{del}</span>
			<span style={{display: 'flex', gap: 2}}>
				{[0, 1, 2, 3, 4].map((k) => (
					<span key={k} style={{width: 8, height: 8, borderRadius: 2, background: k < green ? C.green : k < 5 && del ? C.red : C.dim}} />
				))}
			</span>
		</div>
	);
};

const Row: React.FC<{c: UpstreamCard; i: number; pulseY: number}> = ({c, i, pulseY}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = rowStart(i);
	const cy = ROW0 + i * ROW;
	const t = frame - s;
	const slide = spring({frame: t - 6, fps, config: {damping: 18}});
	const pop = spring({frame: t - 20, fps, config: {damping: 9, mass: 0.6}});
	const flash = ease(t, 20, 26) * (1 - ease(t, 26, 46));
	const lit = Math.max(flash, 1 - Math.min(1, Math.abs(pulseY - (cy + 28)) / 30));
	const branch = `M${LINE_X} ${cy - 30} C${LINE_X} ${cy - 12}, ${BRANCH_X} ${cy - 20}, ${BRANCH_X} ${cy} C${BRANCH_X} ${cy + 20}, ${LINE_X} ${cy + 12}, ${LINE_X} ${cy + 28}`;
	const [owner, repo] = c.repo.split('/');
	const langColor = (c.language && LANG[c.language]) || C.muted;

	return (
		<>
			<svg style={{position: 'absolute', left: 0, top: 0}} width={W} height={600}>
				<path d={branch} fill="none" stroke={C.merged} strokeWidth={2.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(t, 0, 20, [0, 1], Easing.inOut(Easing.quad))} />
				<line x1={BRANCH_X} y1={cy} x2={150} y2={cy} stroke={C.border} strokeWidth={1.5} strokeDasharray="3 4" opacity={ease(t, 8, 14)} />
				<circle cx={BRANCH_X} cy={cy} r={5 * ease(t, 8, 12)} fill={C.bg} stroke={C.merged} strokeWidth={2.5} />
				<circle cx={LINE_X} cy={cy + 28} r={7 * ease(t, 18, 22)} fill={C.merged} />
				<circle cx={LINE_X} cy={cy + 28} r={7 + 16 * lit} fill="none" stroke={C.merged} strokeWidth={2} opacity={lit * 0.8} />
			</svg>
			<div
				style={{
					position: 'absolute',
					left: 150,
					top: cy - 34,
					width: W - 150 - 64,
					height: 68,
					display: 'flex',
					alignItems: 'center',
					gap: 16,
					padding: '0 18px',
					boxSizing: 'border-box',
					borderRadius: 12,
					background: 'rgba(13,17,23,0.88)',
					border: `1px solid ${lit > 0.05 ? `rgba(163,113,247,${0.35 + 0.5 * lit})` : C.border}`,
					boxShadow: `0 0 ${36 * lit}px rgba(163,113,247,${0.35 * lit})`,
					opacity: slide,
					transform: `translateX(${(1 - slide) * -60}px)`,
				}}
			>
				{c.avatar ? (
					<Img src={staticFile(c.avatar)} style={{width: 40, height: 40, borderRadius: 9, background: '#fff'}} />
				) : (
					<div style={{width: 40, height: 40, borderRadius: 9, background: C.panel2}} />
				)}
				<div style={{flex: 1, minWidth: 0}}>
					<div style={{display: 'flex', alignItems: 'baseline', gap: 10, fontFamily: mono, fontSize: 17}}>
						<span style={{color: C.muted}}>{owner}/</span>
						<span style={{color: C.text, fontWeight: 600, marginLeft: -10}}>{repo}</span>
						<span style={{color: C.blue}}>#{c.number}</span>
						{c.language && (
							<span style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted, marginLeft: 6}}>
								<span style={{width: 9, height: 9, borderRadius: 5, background: langColor}} />
								{c.language}
							</span>
						)}
					</div>
					<div style={{fontSize: 15, color: C.muted, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{c.title}</div>
				</div>
				<div style={{opacity: ease(t, 14, 22)}}>
					<DiffBar add={c.additions} del={c.deletions} />
				</div>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 7,
						width: 178,
						justifyContent: 'center',
						padding: '7px 0',
						borderRadius: 999,
						background: C.merged,
						color: '#fff',
						fontSize: 14,
						fontWeight: 600,
						transform: `scale(${pop})`,
						boxShadow: `0 0 ${24 * flash}px ${C.merged}`,
					}}
				>
					<MergeIcon size={14} color="#fff" />
					Merged {fmtDate(c.mergedAt)}
				</div>
			</div>
		</>
	);
};

export const Upstream: React.FC<UpstreamProps> = ({cards, moreMerged, moreOrgs}) => {
	const frame = useCurrentFrame();
	const n = cards.length;
	const end = ROW0 + (n - 1) * ROW + 52;
	const pulseStart = rowStart(n) + 20;
	const pulseY = ease(frame, pulseStart, pulseStart + 50, [110, end + 40], Easing.inOut(Easing.quad));
	const total = n + moreMerged;
	const count = Math.round(ease(frame, 10, 50, [0, total], Easing.out(Easing.cubic)));

	return (
		<AbsoluteFill style={{fontFamily: sans}}>
			<Backdrop tint={C.merged} energy={0.8} />

			<div style={{position: 'absolute', left: 64, top: 40, opacity: ease(frame, 0, 12), transform: `translateY(${ease(frame, 0, 14, [-14, 0])}px)`}}>
				<div style={{display: 'flex', alignItems: 'center', gap: 14, fontSize: 38, fontWeight: 800, letterSpacing: -1, color: C.text}}>
					<MergeIcon size={32} color={C.merged} />
					Merged upstream
				</div>
				<div style={{fontSize: 17, color: C.muted, marginTop: 8}}>Fixes I got merged into some of the most widely used open-source projects</div>
			</div>
			<div style={{position: 'absolute', right: 64, top: 36, textAlign: 'right', opacity: ease(frame, 6, 18)}}>
				<div style={{fontSize: 52, fontWeight: 800, color: C.merged, lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>{count}</div>
				<div style={{fontFamily: mono, fontSize: 13, letterSpacing: 2, color: C.muted, marginTop: 6}}>MERGED PRS</div>
			</div>

			<svg style={{position: 'absolute', left: 0, top: 0}} width={W} height={600}>
				<line x1={LINE_X} y1={110} x2={LINE_X} y2={end + 40} stroke={C.border} strokeWidth={2.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(frame, 4, 40, [0, 1], Easing.inOut(Easing.quad))} />
				<circle cx={LINE_X} cy={pulseY} r={5} fill="#fff" opacity={frame > pulseStart && frame < pulseStart + 52 ? 1 : 0} />
				<circle cx={LINE_X} cy={pulseY} r={16} fill={C.merged} opacity={frame > pulseStart && frame < pulseStart + 52 ? 0.35 : 0} />
			</svg>

			{cards.map((c, i) => (
				<Row key={c.repo} c={c} i={i} pulseY={pulseY} />
			))}

			<div
				style={{
					position: 'absolute',
					left: 150,
					top: end + 22,
					fontFamily: mono,
					fontSize: 15,
					color: C.muted,
					opacity: ease(frame, pulseStart + 30, pulseStart + 46),
				}}
			>
				<span style={{color: C.text}}>+{moreMerged} more merged PRs</span> across {moreOrgs} more organizations · full list below
			</div>
		</AbsoluteFill>
	);
};
