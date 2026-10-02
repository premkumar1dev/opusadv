import { motion } from "framer-motion";
import Hero from '../components/Hero'
import ModelCards from '../components/ModelCards'
import LogoTicker from '../components/LogoTicker';
import FeatureCards from '../components/FeatureCards'
import MigrationSection from '../components/MigrationSection'
import { ReadyIn60Seconds } from '../components/ReadyIn60Seconds'
import { WhyOpusZen } from '../components/WhyOpusZen'
import CTASection from '../components/CTASection'
import GettingStarted from '../components/GettingStarted'
import type { MetaFunction } from "react-router";
import { buildPageMetaTags } from "~/utils/meta-helper";
import { Layout } from '../components/Layout'
import { ScrollSection, ScrollProgress } from "../components/motion/ScrollSection";

export const meta: MetaFunction = ({ matches }) => {
	return buildPageMetaTags(matches, "/");
};

export default function Home() {
	return (
		<Layout>
			{/* Scroll progress bar */}
			<ScrollProgress />

			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
			>
				<Hero />

				{/* Section 01 — Model lineup with parallax orbs */}
				<ScrollSection
					direction="up"
					stagger
					staggerDelay={0.08}
					margin="-60px"
					divider
					orbs={[
						{
							color: "radial-gradient(circle, rgba(201,100,66,0.06) 0%, transparent 70%)",
							size: "lg",
							speed: 0.5,
							top: "20%",
							left: "10%",
						},
						{
							color: "radial-gradient(circle, rgba(156,135,245,0.05) 0%, transparent 70%)",
							size: "md",
							speed: 0.7,
							top: "60%",
							left: "80%",
						},
					]}
				>
					<ModelCards />
				</ScrollSection>

				{/* Section 02 — Feature cards with directional reveal */}
				<ScrollSection
					direction="left"
					stagger
					staggerDelay={0.1}
					margin="-60px"
					divider
					orbs={[
						{
							color: "radial-gradient(circle, rgba(201,100,66,0.04) 0%, transparent 70%)",
							size: "md",
							speed: 0.4,
							top: "30%",
							left: "50%",
						},
					]}
				>
					<FeatureCards />
				</ScrollSection>

				<LogoTicker />

				<ScrollSection
					direction="up"
					stagger
					staggerDelay={0.08}
					margin="-60px"
				>
					<MigrationSection />
				</ScrollSection>

				<ScrollSection
					direction="up"
					stagger
					staggerDelay={0.12}
					margin="-60px"
					divider
					orbs={[
						{
							color: "radial-gradient(circle, rgba(201,100,66,0.05) 0%, transparent 70%)",
							size: "lg",
							speed: 0.6,
							top: "40%",
							left: "30%",
						},
					]}
				>
					<ReadyIn60Seconds />
				</ScrollSection>

				<ScrollSection
					direction="scale"
					stagger
					staggerDelay={0.08}
					margin="-60px"
					divider
				>
					<WhyOpusZen />
				</ScrollSection>

				{/* CTA — full visual impact */}
				<ScrollSection
					direction="up"
					stagger
					staggerDelay={0.1}
					margin="-60px"
					divider
					orbs={[
						{
							color: "radial-gradient(circle, rgba(201,100,66,0.07) 0%, transparent 70%)",
							size: "lg",
							speed: 0.5,
							top: "50%",
							left: "50%",
						},
						{
							color: "radial-gradient(circle, rgba(156,135,245,0.04) 0%, transparent 70%)",
							size: "md",
							speed: 0.8,
							top: "20%",
							left: "75%",
						},
					]}
				>
					<CTASection />
				</ScrollSection>

				<ScrollSection
					direction="up"
					stagger
					staggerDelay={0.12}
					margin="-60px"
					orbs={[
						{
							color: "radial-gradient(circle, rgba(201,100,66,0.04) 0%, transparent 70%)",
							size: "md",
							speed: 0.5,
							top: "30%",
							left: "60%",
						},
					]}
				>
					<GettingStarted />
				</ScrollSection>

			</motion.div>
		</Layout>
	)
}
