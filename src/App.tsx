import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, ChevronRight, Activity, CheckCircle2, RotateCcw, BarChart3, Presentation, Play, Clock, ArrowRight, ArrowLeft, Home, BrainCircuit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

// --- TYPES & DATA ---
type View = 'MENU' | 'ASSESSMENT' | 'DASHBOARD' | 'PRESENTATION' | 'COMBINATION_DASHBOARD';
type AssessmentScreen = 'INTRO' | 'DEMOGRAPHICS' | 'SURVEY_QUIZ' | 'MEMORY_INTRO' | 'MEMORY_TEST' | 'RESULTS';

interface Demographics {
  ageGroup: string;
  aiUsage: string;
}

interface Answer {
  questionId: number;
  score: number;
}

const BASE_QUESTIONS = [
  {
    id: 1,
    text: "How many phone numbers of close friends/family do you know by heart?",
    options: [
      { text: "0-1 numbers", score: 3 },
      { text: "2-4 numbers", score: 2 },
      { text: "5+ numbers", score: 1 },
    ]
  },
  {
    id: 2,
    text: "When you need to remember a task or appointment, what do you usually do?",
    options: [
      { text: "Set a digital reminder or ask AI to remind me", score: 3 },
      { text: "Write it down on paper", score: 2 },
      { text: "Keep it in my head", score: 1 },
    ]
  },
  {
    id: 3,
    text: "If you read a complex article or watch an educational video, how do you retain the information?",
    options: [
      { text: "I ask an AI to summarize it and save the summary", score: 3 },
      { text: "I take my own notes", score: 2 },
      { text: "I just try to remember the key points", score: 1 },
    ]
  },
  {
    id: 4,
    text: "You need to write an email or a short essay. What is your approach?",
    options: [
      { text: "I ask AI to draft it, then I edit it", score: 3 },
      { text: "I write it myself but use grammar/spell checkers heavily", score: 2 },
      { text: "I write it entirely myself from scratch", score: 1 },
    ]
  },
  {
    id: 5,
    text: "When trying to recall a specific fact (like an actor's name or a historical date), what do you do?",
    options: [
      { text: "Immediately search it or ask AI", score: 3 },
      { text: "Think about it for a few minutes, then search if I can't remember", score: 2 },
      { text: "Try hard to remember it until it comes to me", score: 1 },
    ]
  },
  {
    id: 6,
    text: "How often do you find yourself forgetting things you just read or heard?",
    options: [
      { text: "Very often", score: 3 },
      { text: "Sometimes", score: 2 },
      { text: "Rarely", score: 1 },
    ]
  },
  {
    id: 7,
    text: "How often do you use GPS navigation for routes you have driven before?",
    options: [
      { text: "Always, even for familiar places", score: 3 },
      { text: "Sometimes, just to check traffic", score: 2 },
      { text: "Never, I rely on my memory", score: 1 },
    ]
  },
  {
    id: 8,
    text: "Do you know the birthdays of your closest friends and family without checking social media or calendar alerts?",
    options: [
      { text: "No, I rely entirely on notifications", score: 3 },
      { text: "I know some, but need reminders for others", score: 2 },
      { text: "Yes, I know them all by heart", score: 1 },
    ]
  }
];

// --- MOCK DATA INITIAL STATE ---
const INITIAL_AGE_DATA = [
  { age: '3-13', memoryScore: 70, aiReliance: 60 },
  { age: '14-18', memoryScore: 65, aiReliance: 85 },
  { age: '19-25', memoryScore: 60, aiReliance: 90 },
  { age: '26-35', memoryScore: 70, aiReliance: 75 },
  { age: '36-45', memoryScore: 80, aiReliance: 60 },
  { age: '46+', memoryScore: 85, aiReliance: 40 },
];

const INITIAL_USAGE_DATA = [
  { usage: 'Never', avgMemoryScore: 90 },
  { usage: 'Rarely', avgMemoryScore: 85 },
  { usage: 'Sometimes', avgMemoryScore: 75 },
  { usage: 'Daily', avgMemoryScore: 60 },
  { usage: 'Multiple/Day', avgMemoryScore: 50 },
];

const INITIAL_PROFILE_DATA = [
  { name: 'Highly Tech/AI Reliant', value: 45 },
  { name: 'Balanced User', value: 35 },
  { name: 'Highly Independent', value: 20 },
];
const COLORS = ['#4f46e5', '#10b981', '#f59e0b'];

// --- PRESENTATION SLIDES ---
const SLIDES = [
  {
    title: "The Impact of AI on Human Memory",
    subtitle: "A Science Project Investigation",
    content: "Exploring the 'Google Effect' and Digital Amnesia in the Age of Artificial Intelligence."
  },
  {
    title: "Hypothesis",
    subtitle: "Digital Offloading",
    content: "We hypothesize that increased reliance on AI tools (like ChatGPT, Claude) for daily cognitive tasks correlates with a decrease in natural memory recall and an increase in 'digital amnesia'."
  },
  {
    title: "Methodology",
    subtitle: "How we collected data",
    content: "We designed a timed, randomized survey targeting age groups from 13 to 45+. The survey measures both the frequency of AI usage and the participant's reliance on their own memory for facts, numbers, and tasks."
  },
  {
    title: "Key Finding 1: Age vs. Reliance",
    subtitle: "Younger demographics show higher reliance",
    content: "Our data indicates that the 19-25 age group shows the highest AI reliance (90%) and the lowest natural memory score (60%), suggesting a strong correlation between digital native habits and memory offloading."
  },
  {
    title: "Key Finding 2: Usage Frequency",
    subtitle: "The cost of convenience",
    content: "Participants who use AI 'Multiple times a day' scored an average of 50% on the natural memory index, compared to 90% for those who 'Never' use it."
  },
  {
    title: "Conclusion",
    subtitle: "The Future of Cognition",
    content: "AI is a powerful tool, but over-reliance may lead to cognitive atrophy. We must strive to be 'Balanced Users', utilizing AI for efficiency while actively exercising our natural memory."
  }
];

const shuffleArray = (array: any[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// --- COMPONENTS ---

const Starfield = () => {
  const generateStars = (count: number) => {
    let shadow = '';
    for (let i = 0; i < count; i++) {
      shadow += `${Math.random() * 100}vw ${Math.random() * 100}vh #FFF${i === count - 1 ? '' : ','}`;
    }
    return shadow;
  };

  const [stars1] = useState(() => generateStars(700));
  const [stars2] = useState(() => generateStars(200));
  const [stars3] = useState(() => generateStars(100));

  return (
    <div className="fixed inset-0 z-[-1] bg-[#050505] overflow-hidden">
      <style>{`
        @keyframes animStar {
          from { transform: translateY(0px); }
          to { transform: translateY(-100vh); }
        }
        .stars1 {
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: ${stars1};
          animation: animStar 50s linear infinite;
        }
        .stars1:after {
          content: " ";
          position: absolute;
          top: 100vh;
          width: 1px;
          height: 1px;
          background: transparent;
          box-shadow: ${stars1};
        }
        .stars2 {
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: ${stars2};
          animation: animStar 100s linear infinite;
        }
        .stars2:after {
          content: " ";
          position: absolute;
          top: 100vh;
          width: 2px;
          height: 2px;
          background: transparent;
          box-shadow: ${stars2};
        }
        .stars3 {
          width: 3px;
          height: 3px;
          background: transparent;
          box-shadow: ${stars3};
          animation: animStar 150s linear infinite;
        }
        .stars3:after {
          content: " ";
          position: absolute;
          top: 100vh;
          width: 3px;
          height: 3px;
          background: transparent;
          box-shadow: ${stars3};
        }
      `}</style>
      <div className="stars1"></div>
      <div className="stars2"></div>
      <div className="stars3"></div>
    </div>
  );
};

const getMemorySteps = (ageGroup: string) => {
  const baseTime = ageGroup === '46+' ? 15 : ageGroup === '36-45' ? 12 : 10;
  return [
    { type: 'memorize', time: baseTime, title: 'Memorize Words', content: 'apple, train, blue, chair, river, dog, clock, mountain' },
    { type: 'recall', time: 40, title: 'Recall Words', inputType: 'textarea', id: 'words' },
    { type: 'memorize', time: baseTime, title: 'Memorize Numbers', content: '7 2 9 4 1 8 6' },
    { type: 'recall', time: 40, title: 'Repeat Forward & Backward', inputType: 'double-input', id1: 'forward', id2: 'backward' },
    { type: 'memorize', time: baseTime, title: 'Memorize Pattern', content: 'X O X\nO X O\nX O X' },
    { type: 'recall', time: 40, title: 'Redraw Pattern', inputType: 'textarea', id: 'pattern' },
    { type: 'memorize', time: baseTime, title: 'Memorize Shapes Sequence', content: 'Circle ➔ Triangle ➔ Square ➔ Star ➔ Hexagon' },
    { type: 'recall', time: 40, title: 'Recall Shapes', inputType: 'textarea', id: 'shapes', placeholder: 'List the shapes in order...' },
    { type: 'memorize', time: baseTime, title: 'Memorize Sentence', content: 'The small brown dog ran quickly through the quiet park.' },
    { type: 'recall', time: 40, title: 'Rewrite Sentence', inputType: 'textarea', id: 'sentence' },
    { type: 'memorize', time: baseTime, title: 'Memorize Scene', content: 'Red car • Tree • Backpack • Sunset' },
    { type: 'recall', time: 40, title: 'List Details', inputType: 'textarea', id: 'visual' },
    { type: 'memorize', time: baseTime, title: 'Memorize Colors', content: 'Red, Green, Blue, Yellow, Purple, Orange' },
    { type: 'recall', time: 40, title: 'Recall Colors', inputType: 'textarea', id: 'colors' },
    { type: 'memorize', time: baseTime + 5, title: 'Memorize Story Details', content: 'John went to the store at 3 PM to buy milk and bread. He paid $5 and left his umbrella.' },
    { type: 'recall', time: 40, title: 'Story Questions', inputType: 'multi-input', inputs: [
      { id: 'storyTime', placeholder: 'What time did John go?' },
      { id: 'storyItems', placeholder: 'What did he buy?' },
      { id: 'storyLeft', placeholder: 'What did he leave behind?' }
    ]}
  ];
};

function CombinedAssessment({ onHome, onAddResult }: { onHome: () => void, onAddResult: (ageGroup: string, usage: string, memoryScorePercent: number, reliancePercent: number, profile: string, surveyAnswers: Answer[], memoryScores: Record<string, {score: number, maxScore: number}>) => void, key?: string }) {
  const [screen, setScreen] = useState<AssessmentScreen>('INTRO');
  const [demographics, setDemographics] = useState<Demographics>({ ageGroup: '', aiUsage: '' });
  
  const [surveyQuestions, setSurveyQuestions] = useState(BASE_QUESTIONS);
  const [currentSurveyIdx, setCurrentSurveyIdx] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<Answer[]>([]);
  const [surveyTimeLeft, setSurveyTimeLeft] = useState(60);

  const [memorySteps, setMemorySteps] = useState<any[]>([]);
  const [currentMemoryIdx, setCurrentMemoryIdx] = useState(0);
  const [memoryTimeLeft, setMemoryTimeLeft] = useState(0);
  const [memoryInputs, setMemoryInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (screen === 'SURVEY_QUIZ') {
      if (surveyTimeLeft <= 0) {
        handleSurveyAnswer(2);
        return;
      }
      const timer = setInterval(() => setSurveyTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (screen === 'MEMORY_TEST') {
      if (memoryTimeLeft <= 0) {
        handleMemoryNext();
        return;
      }
      const timer = setInterval(() => setMemoryTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [screen, surveyTimeLeft, memoryTimeLeft]);

  const handleDemographicsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (demographics.ageGroup && demographics.aiUsage) {
      setSurveyQuestions(shuffleArray(BASE_QUESTIONS));
      setScreen('SURVEY_QUIZ');
      setSurveyTimeLeft(60);
    }
  };

  const handleSurveyAnswer = (score: number) => {
    const newAnswers = [...surveyAnswers, { questionId: surveyQuestions[currentSurveyIdx].id, score }];
    setSurveyAnswers(newAnswers);
    
    if (currentSurveyIdx < surveyQuestions.length - 1) {
      setCurrentSurveyIdx(currentSurveyIdx + 1);
      setSurveyTimeLeft(60);
    } else {
      const steps = getMemorySteps(demographics.ageGroup);
      setMemorySteps(steps);
      setScreen('MEMORY_INTRO');
    }
  };

  const startMemoryTest = () => {
    setScreen('MEMORY_TEST');
    setCurrentMemoryIdx(0);
    setMemoryTimeLeft(memorySteps[0].time);
  };

  const handleMemoryNext = () => {
    if (currentMemoryIdx < memorySteps.length - 1) {
      setCurrentMemoryIdx(s => s + 1);
      setMemoryTimeLeft(memorySteps[currentMemoryIdx + 1].time);
    } else {
      const results = calculateResults();
      onAddResult(demographics.ageGroup, demographics.aiUsage, results.memoryPercent, results.reliancePercent, results.profile, surveyAnswers, results.memoryScores);
      setScreen('RESULTS');
    }
  };

  const calculateResults = () => {
    const surveyScore = surveyAnswers.reduce((acc, curr) => acc + curr.score, 0);
    const surveyMax = surveyQuestions.length * 3;
    const reliancePercent = (surveyScore / surveyMax) * 100;

    const i = memoryInputs;
    const memoryScores: Record<string, {score: number, maxScore: number}> = {};

    let wScore = 0;
    const w = (i.words || '').toLowerCase();
    ["apple","train","blue","chair","river","dog","clock","mountain"].forEach(word => { if(w.includes(word)) wScore++; });
    memoryScores['words'] = { score: wScore, maxScore: 8 };

    let nScore = 0;
    if ((i.forward || '').replace(/\s/g, '') === "7294186") nScore++;
    if ((i.backward || '').replace(/\s/g, '') === "6814927") nScore++;
    memoryScores['numbers'] = { score: nScore, maxScore: 2 };

    let pScore = 0;
    if ((i.pattern || '').toUpperCase().includes("X")) pScore++;
    memoryScores['pattern'] = { score: pScore, maxScore: 1 };

    let shScore = 0;
    const sh = (i.shapes || '').toLowerCase();
    ["circle", "triangle", "square", "star", "hexagon"].forEach(k => { if(sh.includes(k)) shScore++; });
    memoryScores['shapes'] = { score: shScore, maxScore: 5 };

    let senScore = 0;
    if ((i.sentence || '').toLowerCase().trim() === "the small brown dog ran quickly through the quiet park.") senScore++;
    memoryScores['sentence'] = { score: senScore, maxScore: 1 };

    let vScore = 0;
    const v = (i.visual || '').toLowerCase();
    ["red","car","tree","backpack","sunset"].forEach(k => { if(v.includes(k)) vScore++; });
    memoryScores['visual'] = { score: vScore, maxScore: 5 };

    let cScore = 0;
    const c = (i.colors || '').toLowerCase();
    ["red","green","blue","yellow","purple","orange"].forEach(k => { if(c.includes(k)) cScore++; });
    memoryScores['colors'] = { score: cScore, maxScore: 6 };

    let stScore = 0;
    if ((i.storyTime || '').includes("3")) stScore++;
    const si = (i.storyItems || '').toLowerCase();
    if (si.includes("milk") && si.includes("bread")) stScore++;
    if ((i.storyLeft || '').toLowerCase().includes("umbrella")) stScore++;
    memoryScores['story'] = { score: stScore, maxScore: 3 };

    let memScore = 0;
    let memTotal = 0;
    Object.values(memoryScores).forEach(s => {
      memScore += s.score;
      memTotal += s.maxScore;
    });

    const memoryPercent = (memScore / memTotal) * 100;

    let profile = "";
    let description = "";

    if (reliancePercent >= 70 && memoryPercent < 60) {
      profile = "Highly Tech/AI Reliant";
      description = "You heavily rely on digital tools, which correlates with a lower natural memory score. This is efficient, but you might be experiencing 'digital amnesia'.";
    } else if (reliancePercent < 50 && memoryPercent >= 70) {
      profile = "Highly Independent";
      description = "You rarely rely on AI for memory tasks, and your natural recall is very strong. You regularly exercise your brain to remember facts and tasks.";
    } else {
      profile = "Balanced User";
      description = "You use AI as an assistant but still maintain a solid natural memory. You have a healthy balance of cognitive independence and digital efficiency.";
    }

    return { profile, description, reliancePercent, memoryPercent, memScore, memTotal, memoryScores };
  };

  const currentMemoryStep = memorySteps[currentMemoryIdx];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {screen === 'INTRO' && (
          <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-indigo-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">AI & Human Memory</h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">Welcome to our science project assessment! We are studying how the increasing use of AI impacts our natural memory. This assessment combines a survey with a memory test.</p>
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500" />About this study</h3>
              <ul className="space-y-2 text-slate-600 text-sm">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />Part 1: Timed Survey (60s per question).</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />Part 2: Memory Test (adjusted for your age group).</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />Completely anonymous. No personal data is collected.</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={onHome} className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-8 py-4 rounded-full transition-all"><Home className="w-5 h-5" /> Main Menu</button>
              <button onClick={() => setScreen('DEMOGRAPHICS')} className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-4 rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5">Start Assessment <ChevronRight className="w-5 h-5" /></button>
            </div>
          </motion.div>
        )}

        {screen === 'DEMOGRAPHICS' && (
          <motion.div key="demographics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">First, tell us a bit about yourself</h2>
            <form onSubmit={handleDemographicsSubmit} className="space-y-8">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">What is your age group?</label>
                <div className="grid grid-cols-2 gap-3">
                  {['3-13', '14-18', '19-25', '26-35', '36-45', '46+'].map((age) => (
                    <label key={age} className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none transition-all ${demographics.ageGroup === age ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="ageGroup" value={age} className="sr-only" onChange={(e) => setDemographics({ ...demographics, ageGroup: e.target.value })} required />
                      <span className="font-medium text-slate-900">{age}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">How often do you use AI tools (like ChatGPT, Claude, Gemini)?</label>
                <div className="space-y-3">
                  {['Never', 'Rarely', 'Sometimes', 'Daily', 'Multiple/Day'].map((usage) => (
                    <label key={usage} className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none transition-all ${demographics.aiUsage === usage ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="aiUsage" value={usage} className="sr-only" onChange={(e) => setDemographics({ ...demographics, aiUsage: e.target.value })} required />
                      <span className="font-medium text-slate-900">{usage}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={!demographics.ageGroup || !demographics.aiUsage} className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium px-8 py-4 rounded-xl transition-all">Continue to Survey <ChevronRight className="w-5 h-5" /></button>
            </form>
          </motion.div>
        )}

        {screen === 'SURVEY_QUIZ' && (
          <motion.div key={`survey-${currentSurveyIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4 text-sm font-medium text-slate-500">
                <span>Survey Question {currentSurveyIdx + 1} of {surveyQuestions.length}</span>
                <div className="flex items-center gap-2 text-rose-500 font-bold bg-rose-50 px-3 py-1 rounded-full"><Clock className="w-4 h-4" /> 00:{surveyTimeLeft.toString().padStart(2, '0')}</div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${((currentSurveyIdx) / surveyQuestions.length) * 100}%` }}></div>
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-8 leading-tight">{surveyQuestions[currentSurveyIdx].text}</h2>
            <div className="space-y-4">
              {surveyQuestions[currentSurveyIdx].options.map((option, idx) => (
                <button key={idx} onClick={() => handleSurveyAnswer(option.score)} className="w-full text-left p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all group">
                  <span className="font-medium text-slate-700 group-hover:text-indigo-900 text-lg">{option.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {screen === 'MEMORY_INTRO' && (
          <motion.div key="memory-intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BrainCircuit className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Survey Complete!</h2>
            <p className="text-lg text-slate-600 mb-8">Now, let's test your natural memory. You will be shown a series of items to memorize for a short time, followed by a prompt to recall them.</p>
            <button onClick={startMemoryTest} className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium px-8 py-4 rounded-full transition-all hover:shadow-lg hover:-translate-y-0.5">Start Memory Test <ChevronRight className="w-5 h-5" /></button>
          </motion.div>
        )}

        {screen === 'MEMORY_TEST' && currentMemoryStep && (
          <motion.div key={`memory-${currentMemoryIdx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4 text-sm font-medium text-slate-500">
                <span>Memory Test: Step {currentMemoryIdx + 1} of {memorySteps.length}</span>
                <div className="flex items-center gap-2 text-rose-500 font-bold bg-rose-50 px-3 py-1 rounded-full"><Clock className="w-4 h-4" /> 00:{memoryTimeLeft.toString().padStart(2, '0')}</div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-amber-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${((currentMemoryIdx) / memorySteps.length) * 100}%` }}></div>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">{currentMemoryStep.title}</h3>

            {currentMemoryStep.type === 'memorize' ? (
              <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-2xl font-mono text-slate-800 whitespace-pre-line leading-relaxed">{currentMemoryStep.content}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentMemoryStep.inputType === 'textarea' && (
                  <textarea className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-0 transition-all min-h-[120px]" value={memoryInputs[currentMemoryStep.id] || ''} onChange={(e) => setMemoryInputs({ ...memoryInputs, [currentMemoryStep.id]: e.target.value })} placeholder="Type your answer here..." />
                )}
                {currentMemoryStep.inputType === 'double-input' && (
                  <div className="space-y-4">
                    <input type="text" className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-0 transition-all" value={memoryInputs[currentMemoryStep.id1] || ''} onChange={(e) => setMemoryInputs({ ...memoryInputs, [currentMemoryStep.id1]: e.target.value })} placeholder="Forward" />
                    <input type="text" className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-0 transition-all" value={memoryInputs[currentMemoryStep.id2] || ''} onChange={(e) => setMemoryInputs({ ...memoryInputs, [currentMemoryStep.id2]: e.target.value })} placeholder="Backward" />
                  </div>
                )}
                {currentMemoryStep.inputType === 'multi-input' && (
                  <div className="space-y-4">
                    {currentMemoryStep.inputs.map((inp: any) => (
                      <input key={inp.id} type="text" className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:ring-0 transition-all" value={memoryInputs[inp.id] || ''} onChange={(e) => setMemoryInputs({ ...memoryInputs, [inp.id]: e.target.value })} placeholder={inp.placeholder} />
                    ))}
                  </div>
                )}
                <button onClick={handleMemoryNext} className="w-full mt-6 bg-amber-600 hover:bg-amber-700 text-white font-medium px-8 py-4 rounded-xl transition-all">Next</button>
              </div>
            )}
          </motion.div>
        )}

        {screen === 'RESULTS' && (() => {
          const res = calculateResults();
          const pieData = [
            { name: 'Correct', value: res.memScore },
            { name: 'Missed', value: res.memTotal - res.memScore }
          ];
          return (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full mb-6">
                <Brain className="w-12 h-12" />
              </div>
              <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-2">Your Cognitive Profile</h2>
              <h1 className="text-4xl font-bold text-slate-900 mb-4">{res.profile}</h1>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">{res.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">AI Reliance</h3>
                  <p className="text-3xl font-bold text-indigo-600">{Math.round(res.reliancePercent)}%</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Memory Score</h3>
                  <p className="text-3xl font-bold text-amber-600">{res.memScore} / {res.memTotal}</p>
                </div>
              </div>

              <div className="h-48 w-full flex justify-center mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={onHome} className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-8 py-4 rounded-full transition-all"><Home className="w-5 h-5" /> Main Menu</button>
                <button onClick={() => {
                  setScreen('INTRO');
                  setDemographics({ ageGroup: '', aiUsage: '' });
                  setSurveyAnswers([]);
                  setMemoryInputs({});
                }} className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-4 rounded-full transition-all"><RotateCcw className="w-5 h-5" /> Retake Assessment</button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

function CombinationDashboard({ onHome, allResults }: { onHome: () => void, allResults: any[], key?: string }) {
  const [selectedMemoryTest, setSelectedMemoryTest] = useState('words');
  const [sortOrder, setSortOrder] = useState<'most' | 'least'>('most');
  const [selectedCombo, setSelectedCombo] = useState<any | null>(null);

  const memoryTests = [
    { id: 'words', label: 'Words' },
    { id: 'numbers', label: 'Numbers' },
    { id: 'pattern', label: 'Pattern' },
    { id: 'shapes', label: 'Shapes' },
    { id: 'sentence', label: 'Sentence' },
    { id: 'visual', label: 'Visual' },
    { id: 'colors', label: 'Colors' },
    { id: 'story', label: 'Story' },
  ];

  // Group by survey combination
  const combinationsMap = new Map<string, { count: number, totalAccuracy: number, accuracies: number[], surveyAnswers: any[] }>();

  allResults.forEach(result => {
    if (!result.surveyAnswers || !result.memoryScores) return;
    
    // Create a key for the combination
    // Sort by questionId to ensure consistent keys
    const sortedAnswers = [...result.surveyAnswers].sort((a, b) => a.questionId - b.questionId);
    const comboKey = sortedAnswers.map(a => `${a.questionId}:${a.score}`).join('|');
    
    const memScoreData = result.memoryScores[selectedMemoryTest];
    if (!memScoreData) return;
    
    const accuracy = (memScoreData.score / memScoreData.maxScore) * 100;

    if (!combinationsMap.has(comboKey)) {
      combinationsMap.set(comboKey, { count: 0, totalAccuracy: 0, accuracies: [], surveyAnswers: sortedAnswers });
    }
    
    const combo = combinationsMap.get(comboKey)!;
    combo.count++;
    combo.totalAccuracy += accuracy;
    combo.accuracies.push(accuracy);
  });

  const combinations = Array.from(combinationsMap.entries()).map(([key, data]) => ({
    key,
    count: data.count,
    avgAccuracy: data.totalAccuracy / data.count,
    accuracies: data.accuracies,
    surveyAnswers: data.surveyAnswers
  }));

  if (sortOrder === 'most') {
    combinations.sort((a, b) => b.count - a.count);
  } else {
    combinations.sort((a, b) => a.count - b.count);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12 relative"
    >
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Combination Dashboard</h1>
          <p className="text-slate-500 mt-2">Analyze survey combinations vs memory test accuracy</p>
        </div>
        <button
          onClick={onHome}
          className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-3 rounded-full transition-all"
        >
          <Home className="w-5 h-5" />
          Back
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-slate-700 mb-1">Memory Test</label>
          <select 
            value={selectedMemoryTest} 
            onChange={e => setSelectedMemoryTest(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500"
          >
            {memoryTests.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-semibold text-slate-700 mb-1">Filter</label>
          <select 
            value={sortOrder} 
            onChange={e => setSortOrder(e.target.value as any)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-indigo-500"
          >
            <option value="most">Most Popular to Least Popular</option>
            <option value="least">Least Popular to Most Popular</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {combinations.map(combo => (
          <div 
            key={combo.key} 
            className="bg-slate-50 p-6 rounded-2xl border border-slate-100 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
            onClick={() => setSelectedCombo(combo)}
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Combination</h3>
            <div className="text-sm text-slate-500 mb-4">
              {combo.surveyAnswers.map(a => `Q${a.questionId}: ${a.score}pts`).join(', ')}
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Accuracy', value: combo.avgAccuracy },
                      { name: 'Missed', value: 100 - combo.avgAccuracy }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#4f46e5" />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-2">
              <div className="text-2xl font-bold text-slate-900">{combo.avgAccuracy.toFixed(1)}%</div>
              <div className="text-sm text-slate-500">Avg Accuracy ({combo.count} users)</div>
            </div>
          </div>
        ))}
        {combinations.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            No combination data available yet.
          </div>
        )}
      </div>

      {selectedCombo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Combination Details</h2>
              <button onClick={() => setSelectedCombo(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full">
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <div className="text-sm font-semibold text-indigo-600 mb-1">Users</div>
                <div className="text-3xl font-bold text-indigo-900">{selectedCombo.count}</div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <div className="text-sm font-semibold text-emerald-600 mb-1">Avg Accuracy</div>
                <div className="text-3xl font-bold text-emerald-900">{selectedCombo.avgAccuracy.toFixed(1)}%</div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-800 mb-4">Survey Answers</h3>
            <div className="space-y-3 mb-8">
              {selectedCombo.surveyAnswers.map((ans: any) => {
                const question = BASE_QUESTIONS.find(q => q.id === ans.questionId);
                const option = question?.options.find(o => o.score === ans.score);
                return (
                  <div key={ans.questionId} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-sm font-medium text-slate-700 mb-1">{question?.text}</div>
                    <div className="text-indigo-600 font-semibold">{option?.text} <span className="text-slate-400 font-normal text-xs ml-2">({ans.score} pts)</span></div>
                  </div>
                );
              })}
            </div>

            <h3 className="text-lg font-semibold text-slate-800 mb-4">Individual Accuracies</h3>
            <div className="flex flex-wrap gap-2">
              {selectedCombo.accuracies.map((acc: number, idx: number) => (
                <div key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                  User {idx + 1}: {acc.toFixed(1)}%
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function Dashboard({ onHome, ageData, usageData, profileData, isSimulated, allResults = [] }: { onHome: () => void, ageData: any[], usageData: any[], profileData: any[], isSimulated: boolean, allResults?: any[], key?: string }) {
  const totalParticipants = profileData.reduce((acc, curr) => acc + curr.value, 0);

  // Calculate responses over time (by minute)
  const timeMap = new Map<string, number>();
  let totalResponses = 0;

  allResults.forEach(result => {
    if (result.createdAt) {
      // Handle both Firestore Timestamp and JS Date
      const date = result.createdAt.toDate ? result.createdAt.toDate() : new Date(result.createdAt);
      // Format as HH:MM
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeKey = `${hours}:${minutes}`;
      
      timeMap.set(timeKey, (timeMap.get(timeKey) || 0) + 1);
      totalResponses++;
    }
  });

  // Sort by time
  const timeData = Array.from(timeMap.entries())
    .map(([time, count]) => ({ time, count }))
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12"
    >
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Project Dashboard</h1>
          <p className="text-slate-500 mt-2">
            {isSimulated ? 'Simulated Data Insights from N=150 Participants' : `Live Data Insights from N=${totalParticipants} Participants`}
          </p>
        </div>
        <button
          onClick={onHome}
          className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-3 rounded-full transition-all"
        >
          <Home className="w-5 h-5" />
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Chart 1 */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Age vs. Memory Score & AI Reliance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="age" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Bar dataKey="memoryScore" name="Natural Memory Score" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aiReliance" name="AI Reliance Index" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">AI Usage Frequency vs. Memory Score</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="usage" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="avgMemoryScore" name="Avg Memory Score" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3 */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center">
        <h3 className="text-lg font-semibold text-slate-800 mb-6 w-full text-left">Distribution of Cognitive Profiles</h3>
        <div className="h-72 w-full max-w-md">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={profileData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {profileData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 4: Responses Over Time */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-800">Responses Over Time (Per Minute)</h3>
          <div className="text-sm font-medium text-slate-600 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
            Total Responses: {totalResponses}
          </div>
        </div>
        <div className="h-72">
          {timeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" name="Responses" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              No time data available
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PresentationView({ onHome }: { onHome: () => void, key?: string }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) setCurrentSlide(currentSlide + 1);
  };

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-5xl mx-auto h-[80vh] bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
    >
      <button
        onClick={onHome}
        className="absolute top-6 right-6 z-10 inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-full transition-all backdrop-blur-sm"
      >
        <Home className="w-4 h-4" />
        Exit PPT
      </button>

      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-3xl"
          >
            <h2 className="text-indigo-400 font-bold tracking-widest uppercase mb-4 text-sm md:text-base">
              {SLIDES[currentSlide].subtitle}
            </h2>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 leading-tight">
              {SLIDES[currentSlide].title}
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 leading-relaxed">
              {SLIDES[currentSlide].content}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="h-24 bg-slate-950 flex items-center justify-between px-8">
        <div className="text-slate-500 font-medium">
          Slide {currentSlide + 1} of {SLIDES.length}
        </div>
        <div className="flex gap-4">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            disabled={currentSlide === SLIDES.length - 1}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}



export default function App() {
  const [view, setView] = useState<View>('MENU');
  
  const [ageData, setAgeData] = useState(INITIAL_AGE_DATA);
  const [usageData, setUsageData] = useState(INITIAL_USAGE_DATA);
  const [profileData, setProfileData] = useState(INITIAL_PROFILE_DATA);
  const [allResults, setAllResults] = useState<any[]>([]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSimulated, setIsSimulated] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    const q = query(collection(db, 'results'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newAgeData = INITIAL_AGE_DATA.map(d => ({ ...d, count: 0, totalMem: 0, totalRel: 0 }));
      const newUsageData = INITIAL_USAGE_DATA.map(d => ({ ...d, count: 0, totalMem: 0 }));
      const newProfileData = INITIAL_PROFILE_DATA.map(d => ({ ...d, value: 0 }));
      
      const rawResults: any[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        rawResults.push(data);
        
        const ageItem = newAgeData.find(d => d.age === data.ageGroup);
        if (ageItem) {
          ageItem.count++;
          ageItem.totalMem += data.memoryScorePercent;
          ageItem.totalRel += data.reliancePercent;
        }

        const usageItem = newUsageData.find(d => d.usage === data.aiUsage);
        if (usageItem) {
          usageItem.count++;
          usageItem.totalMem += data.memoryScorePercent;
        }

        const profileItem = newProfileData.find(d => d.name === data.profile);
        if (profileItem) {
          profileItem.value++;
        }
      });

      const hasData = snapshot.docs.length > 0;

      if (hasData) {
        setAgeData(newAgeData.map(d => ({
          age: d.age,
          memoryScore: d.count > 0 ? Math.round(d.totalMem / d.count) : d.memoryScore,
          aiReliance: d.count > 0 ? Math.round(d.totalRel / d.count) : d.aiReliance
        })));

        setUsageData(newUsageData.map(d => ({
          usage: d.usage,
          avgMemoryScore: d.count > 0 ? Math.round(d.totalMem / d.count) : d.avgMemoryScore
        })));

        setProfileData(newProfileData.map(d => ({ name: d.name, value: d.value })));
        setAllResults(rawResults);
        setIsSimulated(false);
      } else {
        setAgeData(INITIAL_AGE_DATA);
        setUsageData(INITIAL_USAGE_DATA);
        setProfileData(INITIAL_PROFILE_DATA);
        setAllResults([]);
        setIsSimulated(true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'results');
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'hrces#p@@') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      setAdminPassword('');
    }
  };

  const handleAddResult = async (ageGroup: string, usage: string, memoryScorePercent: number, reliancePercent: number, profile: string, surveyAnswers: Answer[], memoryScores: Record<string, {score: number, maxScore: number}>) => {
    try {
      await addDoc(collection(db, 'results'), {
        ageGroup,
        aiUsage: usage,
        memoryScorePercent,
        reliancePercent,
        profile,
        surveyAnswers,
        memoryScores,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'results');
    }
  };

  return (
    <div className="min-h-screen text-slate-900 font-sans flex flex-col items-center justify-center p-4 md:p-8 relative z-0">
      <Starfield />
      <AnimatePresence mode="wait">
        {view === 'MENU' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-3xl w-full bg-white rounded-3xl shadow-xl p-8 md:p-12"
          >
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-indigo-600" />
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-4">Science Project Suite</h1>
              <p className="text-lg text-slate-600">
                The Impact of AI on Human Memory & Cognitive Habits
              </p>
            </div>

            <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'max-w-sm mx-auto'} gap-6`}>
              <button
                onClick={() => setView('ASSESSMENT')}
                className="flex flex-col items-center text-center p-8 rounded-2xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
              >
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 text-indigo-600 ml-1" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Take Assessment</h3>
                <p className="text-sm text-slate-500">Combined survey and memory test.</p>
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => setView('DASHBOARD')}
                    className="flex flex-col items-center text-center p-8 rounded-2xl border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50 transition-all group"
                  >
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Data Dashboard</h3>
                    <p className="text-sm text-slate-500">View realistic simulated data and charts.</p>
                  </button>

                  <button
                    onClick={() => setView('PRESENTATION')}
                    className="flex flex-col items-center text-center p-8 rounded-2xl border-2 border-slate-100 hover:border-rose-600 hover:bg-rose-50 transition-all group"
                  >
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Presentation className="w-8 h-8 text-rose-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Presentation</h3>
                    <p className="text-sm text-slate-500">View the project slides and findings.</p>
                  </button>

                  <button
                    onClick={() => setView('COMBINATION_DASHBOARD')}
                    className="flex flex-col items-center text-center p-8 rounded-2xl border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <BrainCircuit className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">Combination</h3>
                    <p className="text-sm text-slate-500">Analyze survey & memory test combinations.</p>
                  </button>
                </>
              )}
            </div>

            {!isAdmin && !showAdminLogin && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Admin Login
                </button>
              </div>
            )}

            {!isAdmin && showAdminLogin && (
              <form onSubmit={handleAdminLogin} className="mt-8 text-center max-w-xs mx-auto flex items-center gap-2">
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Admin password"
                  className="flex-1 px-3 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button type="submit" className="px-3 py-1 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                  Login
                </button>
              </form>
            )}

            {isAdmin && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setIsAdmin(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </motion.div>
        )}

        {view === 'ASSESSMENT' && <CombinedAssessment key="assessment" onHome={() => setView('MENU')} onAddResult={handleAddResult} />}
        {isAdmin && view === 'DASHBOARD' && <Dashboard key="dashboard" onHome={() => setView('MENU')} ageData={ageData} usageData={usageData} profileData={profileData} isSimulated={isSimulated} allResults={allResults} />}
        {isAdmin && view === 'COMBINATION_DASHBOARD' && <CombinationDashboard key="combination" onHome={() => setView('MENU')} allResults={allResults} />}
        {isAdmin && view === 'PRESENTATION' && <PresentationView key="presentation" onHome={() => setView('MENU')} />}
      </AnimatePresence>
    </div>
  );
}
