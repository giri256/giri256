import React from 'react';
import {AbsoluteFill, Easing, Img, interpolateColors, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Backdrop} from './Backdrop';
import {C, ease, HeroProps, lerp, mono, Project, sans, W} from './theme';

// Score: the name decodes and docks in the header, each project gets a spotlight,
// then every card flies into a bento grid that holds as the final frame.
const INTRO = 64;
const SLOT = 56;
const OUTRO = 110;
export const heroFrames = (n: number) => INTRO + n * SLOT + OUTRO;

type Rect = {x: number; y: number; w: number; h: number; ry: number; rx: number};
const mix = (a: Rect, b: Rect, t: number): Rect => ({
	x: lerp(a.x, b.x, t),
	y: lerp(a.y, b.y, t),
	w: lerp(a.w, b.w, t),
	h: lerp(a.h, b.h, t),
	ry: lerp(a.ry, b.ry, t),
	rx: lerp(a.rx, b.rx, t),
});

const SPOT: Rect = {x: 610, y: 136, w: 606, h: 340, ry: -16, rx: 5};
const OFF: Rect = {...SPOT, x: SPOT.x + 520, y: SPOT.y + 40, ry: -55};
const slot = (i: number, n: number): Rect => {
	const w = 100;
	const gap = 12;
	const left = SPOT.x + (SPOT.w - (n * w + (n - 1) * gap)) / 2;
	return {x: left + i * (w + gap), y: 566, w, h: 56, ry: 0, rx: 0};
};
const bento = (i: number, n: number): Rect => {
	const top = 140;
	const height = 404;
	if (i === 0 || n === 1) return {x: 64, y: top, w: n === 1 ? W - 128 : 650, h: height, ry: 0, rx: 0};
	const rows = Math.ceil((n - 1) / 2);
	const h = (height - (rows - 1) * 16) / rows;
	const k = i - 1;
	const cols = n - 1 === 1 ? 1 : 2;
	const w = (W - 64 - 730 - (cols - 1) * 16) / cols;
	return {x: 730 + (k % cols) * (w + 16), y: top + Math.floor(k / cols) * (h + 16), w, h, ry: 0, rx: 0};
};

const GLYPHS = '!<>-_\\/[]{}=+*^?#01';
const decode = (text: string, frame: number, start: number, step: number) =>
	[...text]
		.map((ch, k) => (ch === ' ' || frame >= start + k * step ? ch : GLYPHS[Math.floor(random(`${k}-${Math.floor(frame / 2)}`) * GLYPHS.length)]))
		.join('');

const Card: React.FC<{p: Project; i: number; n: number}> = ({p, i, n}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = INTRO + i * SLOT;
	const F = INTRO + n * SLOT;
	const t = frame - s;
	if (t < -1) return null;

	const enter = spring({frame: t, fps, config: {damping: 17, mass: 0.9}});
	let r = mix(OFF, SPOT, enter);
	r = {...r, ry: r.ry + ease(frame, s + 8, s + SLOT, [0, 9], Easing.linear), rx: r.rx - ease(frame, s + 8, s + SLOT, [0, 3], Easing.linear)};
	r = mix(r, slot(i, n), ease(frame, s + SLOT - 10, s + SLOT + 12, [0, 1], Easing.inOut(Easing.cubic)));
	const fin = spring({frame: frame - F - 6 - i * 5, fps, config: {damping: 16, mass: 0.8}});
	r = mix(r, bento(i, n), fin);

	const spotlit = Math.min(ease(frame, s, s + 10), 1 - ease(frame, s + SLOT - 10, s + SLOT));
	const shine = ease(frame, s + 8, s + 34, [140, -60], Easing.inOut(Easing.quad));
	const finShine = ease(frame, F + 30 + i * 6, F + 60 + i * 6, [140, -60], Easing.inOut(Easing.quad));
	const big = i === 0;

	return (
		<div
			style={{
				position: 'absolute',
				left: r.x,
				top: r.y,
				width: r.w,
				height: r.h,
				opacity: ease(frame, s - 1, s + 6),
				transform: `perspective(1500px) rotateY(${r.ry}deg) rotateX(${r.rx}deg)`,
				zIndex: spotlit > 0.01 ? 20 : 10 - i,
				borderRadius: lerp(16, 8, ease(frame, s + SLOT - 10, s + SLOT + 12)) + 6 * fin,
				overflow: 'hidden',
				background: C.panel,
				boxShadow: `0 0 0 1px ${p.accent}${spotlit > 0.5 || fin > 0.5 ? '88' : '44'}, 0 30px 90px -20px ${p.accent}${Math.round(spotlit * 140 + fin * 60)
					.toString(16)
					.padStart(2, '0')}`,
			}}
		>
			{p.image ? (
				<Img src={staticFile(p.image)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: big ? 'center top' : 'left top', background: '#fff'}} />
			) : (
				<div
					style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: `radial-gradient(circle at 30% 20%, ${p.accent}55, ${C.panel} 70%)`,
						fontFamily: mono,
						fontSize: 34,
						color: C.text,
					}}
				>
					{p.title}
				</div>
			)}
			{[shine, finShine].map((x, k) => (
				<div
					key={k}
					style={{
						position: 'absolute',
						inset: 0,
						background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)',
						backgroundSize: '250% 100%',
						backgroundPosition: `${x}% 0`,
					}}
				/>
			))}
			{/* Caption for the bento grid. */}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					padding: big ? '60px 22px 18px' : '36px 14px 11px',
					background: 'linear-gradient(transparent, rgba(5,7,11,0.92) 55%)',
					opacity: ease(frame, F + 18 + i * 5, F + 34 + i * 5),
					transform: `translateY(${ease(frame, F + 18 + i * 5, F + 34 + i * 5, [12, 0])}px)`,
				}}
			>
				<div style={{fontFamily: sans, fontWeight: 800, fontSize: big ? 28 : 16, color: C.text, letterSpacing: -0.3}}>{p.title}</div>
				<div
					style={{
						fontFamily: mono,
						fontSize: big ? 14 : 11,
						color: p.accent,
						marginTop: 4,
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
				>
					{p.metric ?? p.tagline}
				</div>
			</div>
		</div>
	);
};

const Spotlight: React.FC<{p: Project; i: number; n: number}> = ({p, i, n}) => {
	const frame = useCurrentFrame();
	const t = frame - (INTRO + i * SLOT);
	if (t < 0 || t > SLOT) return null;
	const out = ease(t, SLOT - 12, SLOT - 3);
	const rise = (from: number, dur = 12) => ({
		opacity: ease(t, from, from + dur),
		transform: `translateY(${ease(t, from, from + dur, [26, 0])}px)`,
	});
	const long = p.title.length > 16;
	return (
		<div style={{position: 'absolute', left: 64, top: 168, width: 500, opacity: 1 - out, transform: `translateY(${-20 * out}px)`}}>
			<div style={{fontFamily: mono, fontSize: 15, color: p.accent, letterSpacing: 2, ...rise(1)}}>
				{String(i + 1).padStart(2, '0')} <span style={{color: C.dim}}>/ {String(n).padStart(2, '0')}</span>
			</div>
			<div style={{overflow: 'hidden', marginTop: 10, paddingBottom: 6}}>
				<div
					style={{
						fontFamily: sans,
						fontWeight: 800,
						fontSize: long ? 44 : 58,
						lineHeight: 1.05,
						letterSpacing: -1.5,
						color: C.text,
						transform: `translateY(${ease(t, 3, 17, [110, 0], Easing.out(Easing.exp))}%)`,
					}}
				>
					{p.title}
				</div>
			</div>
			<div style={{fontFamily: sans, fontSize: 23, lineHeight: 1.35, color: C.muted, marginTop: 10, ...rise(8)}}>{p.tagline}</div>
			{p.metric && (
				<div
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 10,
						marginTop: 26,
						padding: '10px 16px',
						borderRadius: 999,
						border: `1px solid ${p.accent}88`,
						background: `${p.accent}1f`,
						boxShadow: `0 0 ${24 * ease(t, 14, 24)}px ${p.accent}44`,
						fontFamily: mono,
						fontSize: 16,
						color: C.text,
						...rise(13),
					}}
				>
					<span style={{width: 8, height: 8, borderRadius: 4, background: p.accent, boxShadow: `0 0 10px ${p.accent}`}} />
					{p.metric}
				</div>
			)}
			<div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 22}}>
				{p.stack.map((s, k) => (
					<div
						key={s}
						style={{
							fontFamily: mono,
							fontSize: 13,
							color: C.muted,
							padding: '5px 11px',
							borderRadius: 6,
							border: `1px solid ${C.border}`,
							background: 'rgba(22,27,34,0.8)',
							...rise(18 + k * 3, 9),
						}}
					>
						{s}
					</div>
				))}
				{p.stars && (
					<div style={{fontFamily: mono, fontSize: 13, color: C.gold, padding: '5px 11px', ...rise(18 + p.stack.length * 3, 9)}}>★ {p.stars}</div>
				)}
			</div>
		</div>
	);
};

export const Hero: React.FC<HeroProps> = ({name, login, role, tagline, projects, moreProjects}) => {
	const frame = useCurrentFrame();
	const n = projects.length;
	const F = INTRO + n * SLOT;

	// The name decodes in the middle, then docks top-left as a header.
	const dock = ease(frame, 42, 66, [0, 1], Easing.inOut(Easing.cubic));
	const typed = Math.round(ease(frame, 20, 44, [0, tagline.length], Easing.linear));
	const starts = projects.map((_, i) => INTRO + i * SLOT);
	const tint =
		n > 1
			? interpolateColors(frame, [...starts, F + 20], [...projects.map((p) => p.accent), C.merged])
			: projects[0]?.accent ?? C.merged;
	const active = Math.min(n - 1, Math.max(0, Math.floor((frame - INTRO) / SLOT)));
	const finale = ease(frame, F, F + 20);

	return (
		<AbsoluteFill style={{fontFamily: sans}}>
			<Backdrop tint={tint} energy={ease(frame, 0, 40, [0.5, 1])} />

			{/* Soft spotlight behind the active card. */}
			<div
				style={{
					position: 'absolute',
					left: SPOT.x - 120,
					top: SPOT.y - 120,
					width: SPOT.w + 240,
					height: SPOT.h + 240,
					background: `radial-gradient(ellipse, ${tint} 0%, transparent 60%)`,
					opacity: 0.22 * ease(frame, INTRO, INTRO + 14) * (1 - finale),
				}}
			/>

			{/* Header: role, name, tagline. */}
			<div
				style={{
					position: 'absolute',
					left: lerp(W / 2, 64, dock),
					top: lerp(196, 38, dock),
					transform: `translateX(${-50 * (1 - dock)}%) scale(${lerp(1, 0.34, dock)})`,
					transformOrigin: 'left top',
					fontWeight: 800,
					fontSize: 128,
					letterSpacing: -4,
					lineHeight: 1,
					color: C.text,
					whiteSpace: 'nowrap',
					opacity: ease(frame, 0, 6),
					textShadow: `0 0 ${40 * (1 - dock)}px rgba(163,113,247,0.45)`,
				}}
			>
				{decode(name, frame, 4, 3)}
			</div>
			<div
				style={{
					position: 'absolute',
					width: W,
					top: 156,
					textAlign: 'center',
					fontFamily: mono,
					fontSize: 18,
					letterSpacing: 4,
					textTransform: 'uppercase',
					color: C.merged,
					opacity: ease(frame, 8, 18) * (1 - ease(frame, 40, 50)),
				}}
			>
				{role}
			</div>
			<div
				style={{
					position: 'absolute',
					width: W,
					top: 352,
					textAlign: 'center',
					fontSize: 30,
					color: C.muted,
					opacity: 1 - ease(frame, 44, 54),
				}}
			>
				{tagline.slice(0, typed)}
				<span style={{opacity: frame % 16 < 8 ? 1 : 0, color: C.merged}}>▍</span>
			</div>
			<div style={{position: 'absolute', left: 64, top: 86, fontFamily: mono, fontSize: 15, color: C.muted, opacity: ease(frame, 58, 70)}}>
				{role} <span style={{color: C.dim}}>· github.com/{login}</span>
			</div>

			{/* Section label, top right: progress during spotlights, then the summary. */}
			<div
				style={{
					position: 'absolute',
					right: 64,
					top: 48,
					textAlign: 'right',
					fontFamily: mono,
					fontSize: 14,
					letterSpacing: 3,
					color: C.muted,
					opacity: ease(frame, 60, 72) * (1 - finale),
				}}
			>
				PROJECTS I BUILT
				<div style={{display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10}}>
					{projects.map((p, i) => (
						<div key={p.name} style={{width: 28, height: 4, borderRadius: 2, background: C.panel2, overflow: 'hidden'}}>
							<div
								style={{
									height: '100%',
									width: `${ease(frame, INTRO + i * SLOT, INTRO + (i + 1) * SLOT, [0, 100], Easing.linear)}%`,
									background: i === active ? p.accent : C.muted,
								}}
							/>
						</div>
					))}
				</div>
			</div>
			<div
				style={{
					position: 'absolute',
					right: 64,
					top: 52,
					fontFamily: mono,
					fontSize: 15,
					letterSpacing: 3,
					color: C.text,
					opacity: ease(frame, F + 10, F + 26),
				}}
			>
				THINGS I BUILT
			</div>

			{/* Parking strip under the spotlight. */}
			{projects.map((p, i) => {
				const r = slot(i, n);
				return (
					<div
						key={p.name}
						style={{
							position: 'absolute',
							left: r.x,
							top: r.y,
							width: r.w,
							height: r.h,
							borderRadius: 8,
							border: `1px dashed ${C.border}`,
							opacity: ease(frame, INTRO - 6, INTRO + 6) * (1 - finale),
						}}
					/>
				);
			})}

			{projects.map((p, i) => (
				<Spotlight key={p.name} p={p} i={i} n={n} />
			))}
			{projects.map((p, i) => (
				<Card key={p.name} p={p} i={i} n={n} />
			))}

			<div
				style={{
					position: 'absolute',
					width: W,
					top: 572,
					textAlign: 'center',
					fontFamily: mono,
					fontSize: 15,
					color: C.muted,
					opacity: ease(frame, F + 50, F + 66),
				}}
			>
				{moreProjects > 0 ? `+${moreProjects} more projects · ` : ''}
				<span style={{color: C.text}}>github.com/{login}</span>
			</div>
		</AbsoluteFill>
	);
};
