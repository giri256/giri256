import React from 'react';
import {Composition} from 'remotion';
import hero from '../data/hero-props.json';
import upstream from '../data/upstream-props.json';
import {Hero, heroFrames} from './Hero';
import {FPS, H, HeroProps, UH, UpstreamProps, W} from './theme';
import {Upstream, upstreamFrames} from './Upstream';

// Durations follow the data, so a fifth project or card gets its own beat.
export const Root: React.FC = () => (
	<>
		<Composition
			id="Hero"
			component={Hero}
			durationInFrames={heroFrames(hero.projects.length)}
			fps={FPS}
			width={W}
			height={H}
			defaultProps={hero as HeroProps}
			calculateMetadata={({props}) => ({durationInFrames: heroFrames(props.projects.length)})}
		/>
		<Composition
			id="Upstream"
			component={Upstream}
			durationInFrames={upstreamFrames(upstream.cards.length)}
			fps={FPS}
			width={W}
			height={UH}
			defaultProps={upstream as UpstreamProps}
			calculateMetadata={({props}) => ({durationInFrames: upstreamFrames(props.cards.length)})}
		/>
	</>
);
