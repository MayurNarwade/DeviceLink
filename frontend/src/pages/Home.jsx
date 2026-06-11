import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation, useMotionValue, useTransform, useScroll, useSpring } from 'framer-motion';
import { 
  Sparkles, Zap, Shield, Lock, Globe, ArrowRight,
  FileUp, QrCode, CheckCircle, Users, Monitor, Phone,
  Star, Diamond, Gift
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  // Mouse parallax for hero
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);
  
  // Scroll progress for sticky effects
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = e.clientX - window.innerWidth / 2;
      const y = e.clientY - window.innerHeight / 2;
      mouseX.set(x);
      mouseY.set(y);
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Feature list
  const features = [
    { icon: Zap, title: 'Lightning Fast', desc: 'Peer-to-peer WebRTC for instant transfers', color: 'from-yellow-500 to-orange-500' },
    { icon: Shield, title: 'Privacy First', desc: 'End-to-end encrypted, no servers store data', color: 'from-green-500 to-emerald-500' },
    { icon: Lock, title: 'No Signup', desc: 'Completely anonymous, no personal data', color: 'from-blue-500 to-cyan-500' },
    { icon: Globe, title: 'Any Network', desc: 'Works across WiFi, cellular, and firewalls', color: 'from-purple-500 to-pink-500' },
    { icon: FileUp, title: 'Any File', desc: 'Send images, documents, or large files', color: 'from-red-500 to-rose-500' },
    { icon: QrCode, title: 'Quick Pair', desc: 'One-click QR code pairing', color: 'from-indigo-500 to-violet-500' },
  ];

  const steps = [
    { icon: Users, title: 'Create Session', desc: 'One device creates a temporary room', color: 'from-blue-500 to-indigo-500' },
    { icon: QrCode, title: 'Share Code', desc: 'Share session ID or QR code', color: 'from-purple-500 to-pink-500' },
    { icon: Users, title: 'Join Session', desc: 'Second device joins instantly', color: 'from-green-500 to-emerald-500' },
    { icon: Sparkles, title: 'Collaborate', desc: 'Chat & transfer files peer-to-peer', color: 'from-orange-500 to-red-500' },
  ];

  // Particle background (static but animated)
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 10,
  }));

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-x-hidden relative">
      
      {/* Animated Particle Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute bg-white/20 rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: p.left,
              top: p.top,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Mouse-follow glow effect */}
      <motion.div
        className="fixed w-96 h-96 rounded-full bg-purple-500/20 blur-3xl pointer-events-none z-0"
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: "tween", ease: "backOut", duration: 0.5 }}
      />

      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 origin-left z-50"
        style={{ scaleX }}
      />

      {/* Hero Section */}
      <div className="relative z-10">
        <motion.div 
          style={{ rotateX, rotateY }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="container mx-auto px-4 py-20"
        >
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Animated Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 mb-8 border border-white/20 shadow-lg"
            >
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-sm font-medium text-white">✨ Beta Release • Free Forever ✨</span>
            </motion.div>

            {/* Main Title with floating icons */}
            <div className="relative">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -left-16 top-10 text-purple-300 hidden lg:block"
              >
                <Diamond size={32} />
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -right-16 top-20 text-pink-300 hidden lg:block"
              >
                <Gift size={28} />
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent drop-shadow-2xl"
              >
                AetherLink
              </motion.h1>
            </div>

            {/* Subtitle with typing effect */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-purple-200 mb-8 max-w-2xl mx-auto"
            >
              Instant, private, peer-to-peer collaboration
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="block text-purple-300 text-lg"
              >
                No signup. No cloud. Just pure connection.
              </motion.span>
            </motion.p>

            {/* CTA Buttons with 3D hover */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-20"
            >
              <motion.button
                whileHover={{ scale: 1.05, rotateZ: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/create')}
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white text-lg overflow-hidden shadow-xl"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Create Session <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500"
                  initial={{ x: "100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/join')}
                className="px-8 py-4 bg-white/10 backdrop-blur-lg rounded-xl font-semibold text-white border border-white/20 transition-all shadow-lg"
              >
                Join Session
              </motion.button>
            </motion.div>

            {/* Floating Preview Card */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, type: "spring" }}
              className="relative max-w-4xl mx-auto"
            >
              <div className="bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl">
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-8">
                  <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                    {[
                      { icon: Monitor, text: 'Device A creates session', color: 'purple' },
                      { icon: QrCode, text: 'Shares QR code', color: 'pink' },
                      { icon: Phone, text: 'Device B joins', color: 'green' },
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + idx * 0.2 }}
                        className="flex items-center gap-3 bg-white/10 rounded-lg px-6 py-3"
                      >
                        <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                        <span className="text-white">{item.text}</span>
                        {idx < 2 && <ArrowRight className="w-4 h-4 text-purple-400" />}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Features Grid with Stagger */}
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-12"
          >
            <motion.h2 
              initial={{ y: 30 }}
              whileInView={{ y: 0 }}
              className="text-4xl md:text-5xl font-bold text-white mb-4"
            >
              Why Choose AetherLink?
            </motion.h2>
            <p className="text-purple-200 text-lg">Everything you need for secure temporary collaboration</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
                viewport={{ once: true }}
                whileHover={{ y: -15, transition: { type: "spring", stiffness: 300 } }}
                onHoverStart={() => setHoveredCard(index)}
                onHoverEnd={() => setHoveredCard(null)}
                className="relative group"
              >
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl"
                  animate={{ opacity: hoveredCard === index ? 0.4 : 0 }}
                  transition={{ duration: 0.2 }}
                />
                <div className="relative bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/30 transition-all duration-300">
                  <motion.div 
                    className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} p-2.5 mb-4`}
                    whileHover={{ rotate: 5, scale: 1.1 }}
                  >
                    <feature.icon className="w-full h-full text-white" />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-purple-200">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How It Works with connecting lines */}
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-purple-200">Three simple steps to start collaborating</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-transparent" />
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.15, type: "spring" }}
                viewport={{ once: true }}
                className="text-center relative z-10"
              >
                <motion.div 
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${step.color} mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white shadow-lg`}
                  whileHover={{ rotate: 360, transition: { duration: 0.5 } }}
                >
                  {index + 1}
                </motion.div>
                <step.icon className="w-10 h-10 mx-auto mb-3 text-purple-400" />
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-purple-200 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Footer with particle effect on hover */}
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 p-12 text-center cursor-pointer shadow-2xl"
            onClick={() => navigate('/create')}
          >
            <div className="absolute inset-0 bg-black/20"></div>
            <motion.div 
              className="absolute -top-40 -right-40 w-80 h-80 bg-white/20 rounded-full filter blur-3xl"
              animate={{ scale: [1, 1.2, 1], rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <div className="relative z-10">
              <motion.h2 
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Ready to experience true privacy?
              </motion.h2>
              <p className="text-purple-100 mb-8 text-lg">Start your first session now – no registration required</p>
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "white", color: "purple" }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold text-lg shadow-lg transition-all"
              >
                Get Started Free
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Home;