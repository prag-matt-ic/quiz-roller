import { type Question } from '@/model/schema'

export const QUESTIONS: Question[] = [
  {
    id: 'ux_ui_q1',
    difficulty: 1,
    text: 'What does the "visibility of system status" heuristic advise UI designers to do?',
    subtopic: 'Usability heuristics',
    answers: [
      {
        text: 'Keep users informed about what is happening by providing appropriate feedback within a reasonable time.',
        isCorrect: true,
      },
      {
        text: 'Minimize status updates to only critical moments to reduce distractions.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.nngroup.com/articles/ten-usability-heuristics/',
    citation:
      'The Nielsen-Norman Group states that the design should always keep users informed about what is going on through appropriate feedback; predictable feedback helps users determine next steps and builds trust:contentReference[oaicite:0]{index=0}.',
  },
  {
    id: 'ui_p1',
    difficulty: 2,
    text: 'In UI design, what does the principle of clarity and simplicity advise designers to do?',
    subtopic: 'Clarity & simplicity',
    answers: [
      {
        text: 'Keep the interface clean and straightforward with intuitive layouts, clear labels and consistent patterns.',
        isCorrect: true,
      },
      {
        text: 'Focus on adding only minimal decorative details while still including complex features.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.lyssna.com/blog/ui-design-principles/',
    citation:
      'Lyssna advises that clarity and simplicity mean keeping the design clean and straightforward, using intuitive layouts, clear labels and consistent patterns so users instantly know what to do and where to go:contentReference[oaicite:1]{index=1}.',
  },
  {
    id: 'ui_w1',
    difficulty: 1,
    text: 'What is the primary goal of user interface (UI) design?',
    subtopic: 'Definition & purpose',
    answers: [
      {
        text: 'Maximise usability and experience by making interactions simple and efficient.',
        isCorrect: true,
      },
      {
        text: 'To prioritise visual decoration and smooth animations.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/User_interface_design',
    citation:
      'The Wikipedia article states that UI design is the design of user interfaces for machines and software, focusing on maximizing usability and the user experience; it aims to make interactions simple and efficient through user-centered design:contentReference[oaicite:2]{index=2}.',
  },
  {
    id: 'ux_ui_q2',
    difficulty: 2,
    text: 'Which of Jakob Nielsen’s usability heuristics urges designers to use words, phrases and concepts familiar to users and follow real-world conventions?',
    subtopic: 'Usability heuristics',
    answers: [
      {
        text: 'Match between the system and the real world.',
        isCorrect: true,
      },
      {
        text: 'Error prevention.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.nngroup.com/articles/ten-usability-heuristics/',
    citation:
      'The "match between the system and the real world" heuristic advises designers to speak the users’ language and use real-world conventions so the interface feels natural:contentReference[oaicite:4]{index=4}.',
  },
  {
    id: 'ui_p2',
    difficulty: 1,
    text: 'Why is consistency across UI elements and interactions important?',
    subtopic: 'Consistency',
    answers: [
      {
        text: 'Consistency ensures that buttons, colours and interactions behave the same across a product, helping users build familiarity and confidence as they navigate.',
        isCorrect: true,
      },
      {
        text: 'Occasionally varying buttons and interactions can be used to surprise users, which some believe keeps experiences interesting even if it sacrifices predictability.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.lyssna.com/blog/ui-design-principles/',
    citation:
      'The Lyssna article notes that consistent UI design means buttons, colours and interactions remain uniform across the interface, preventing frustration and helping users build familiarity and confidence:contentReference[oaicite:5]{index=5}.',
  },
  {
    id: 'ux_ui_q3',
    difficulty: 3,
    text: "According to Hick's law, what happens to the decision time when the number of choices increases?",
    subtopic: 'UX laws',
    answers: [
      {
        text: 'The time it takes to make a decision increases (logarithmically) as the number of choices increases.',
        isCorrect: true,
      },
      {
        text: 'The time to make decisions stays roughly the same regardless of the number of options because people adapt to complexity.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://think.design/blog/understanding-hicks-law-ux-design/',
    citation:
      'Think Design explains that Hick’s law states the more choices people have, the longer it takes them to decide; response time increases logarithmically with the number of options:contentReference[oaicite:7]{index=7}.',
  },
  {
    id: 'ui_p3',
    difficulty: 2,
    text: "How can visual hierarchy guide a user's attention in a user interface?",
    subtopic: 'Visual hierarchy',
    answers: [
      {
        text: 'By using size, colour and placement to highlight the most important elements, designers can ensure users see key information first.',
        isCorrect: true,
      },
      {
        text: 'By giving elements equal emphasis through consistent colours and typography, designers create a clean, calming UI.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.lyssna.com/blog/ui-design-principles/',
    citation:
      'Lyssna explains that visual hierarchy guides users’ attention by using size, colour and placement to highlight important elements like call-to-action buttons, ensuring users see what matters most at the right time:contentReference[oaicite:8]{index=8}.',
  },
  {
    id: 'ui_w4',
    difficulty: 2,
    text: 'What is the purpose of usability testing in user interface design?',
    subtopic: 'Usability testing',
    answers: [
      {
        text: 'It evaluates how users interact with an interface to identify pain points and measure how efficiently they can complete tasks.',
        isCorrect: true,
      },
      {
        text: 'It primarily measures aesthetic preferences by asking users to rate colours and visual styles.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/User_interface_design',
    citation:
      'The Wikipedia article states that usability testing evaluates how users interact with an interface; it provides insight into user pain points by showing how efficiently a user can complete tasks without error, highlighting areas for improvement:contentReference[oaicite:9]{index=9}.',
  },
  {
    id: 'ui_w5',
    difficulty: 2,
    text: 'Which of the following is a documented benefit of improving usability in a product?',
    subtopic: 'Benefits',
    answers: [
      {
        text: 'Increased user efficiency and satisfaction, higher revenues from increased sales, and reduced development and support costs.',
        isCorrect: true,
      },
      {
        text: 'Greater reliance on extensive training and support, which can drive up costs and decrease productivity.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/Usability',
    citation:
      'The benefits section of the usability article lists higher revenues through increased sales, increased user efficiency and satisfaction, reduced development costs and reduced support costs:contentReference[oaicite:10]{index=10}.',
  },
  {
    id: 'ux_ui_q4',
    difficulty: 2,
    text: "Fitts's law is often used in interaction design to predict how quickly a user can click or tap on a target. Which two factors does Fitts's law say primarily determine the time needed to reach a target?",
    subtopic: 'UX laws',
    answers: [
      {
        text: 'The distance to the target and the size of the target.',
        isCorrect: true,
      },
      {
        text: 'The shape and the colour of the target.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://dovetail.com/ux/what-is-fitts-law/',
    citation:
      'Dovetail notes that Fitts’ law states that the time to acquire a target depends on the distance to and size of the target; larger, closer objects are easier to interact with:contentReference[oaicite:11]{index=11}.',
  },
  {
    id: 'ux_ui_q5',
    difficulty: 3,
    text: "In error prevention, what distinguishes a slip from a mistake according to Nielsen's usability heuristics?",
    subtopic: 'Error types',
    answers: [
      {
        text: 'A slip is an unconscious error caused by inattention, whereas a mistake is a conscious error resulting from a mismatch between the user’s mental model and the design.',
        isCorrect: true,
      },
      {
        text: 'A slip is a minor procedural error, while a mistake involves choosing the wrong tool or option even though the user’s underlying intent is correct.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.nngroup.com/articles/ten-usability-heuristics/',
    citation:
      'The error prevention heuristic notes that there are two types of errors: slips (unconscious errors caused by inattention) and mistakes (conscious errors based on a mismatch between the user’s mental model and the design):contentReference[oaicite:13]{index=13}.',
  },
  {
    id: 'ui_p5',
    difficulty: 1,
    text: 'How does contrast contribute to UI design and accessibility?',
    subtopic: 'Contrast & accessibility',
    answers: [
      {
        text: 'Contrast refers to differences in colour, size or shape; high contrast helps users quickly identify important elements and enhances readability, especially for people with vision impairments.',
        isCorrect: true,
      },
      {
        text: 'Moderate contrast can be used to create a softer visual experience, though designers should be mindful that readability may be slightly reduced.',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://medium.com/@vpd07420boluwatimilehin/design-principles-colour-theory-and-typography-in-ui-ux-design-9dfdd953799a',
    citation:
      'The same Medium article explains that contrast is the difference between UI elements (colour, size or shape); high contrast makes elements stand out and is essential for accessible designs because it helps users quickly identify important elements and improves readability:contentReference[oaicite:14]{index=14}.',
  },
  {
    id: 'ux_ui_q6',
    difficulty: 2,
    text: "What does Miller's law imply about human working memory, and how should designers structure information to accommodate this?",
    subtopic: 'Cognitive load',
    answers: [
      {
        text: 'People can keep about seven (plus or minus two) items in working memory, so information should be organised into small, digestible chunks.',
        isCorrect: true,
      },
      {
        text: 'Working memory can handle dozens of items provided that the content is interesting.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://lawsofux.com/millers-law/',
    citation:
      'Laws of UX explains that the average person can only keep around 7±2 items in working memory and recommends organising content into smaller chunks to make it easier to process and remember:contentReference[oaicite:15]{index=15}.',
  },
  {
    id: 'ui_p6',
    difficulty: 2,
    text: 'Why is designing for responsiveness and adaptability important in modern UI design?',
    subtopic: 'Responsiveness',
    answers: [
      {
        text: 'Users switch between devices, so interfaces should adapt across mobile phones, tablets and desktops by adjusting layouts and interactions accordingly.',
        isCorrect: true,
      },
      {
        text: 'Starting with desktop layouts and scaling down to smaller devices is simpler and sufficient for most products.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.lyssna.com/blog/ui-design-principles/',
    citation:
      'Lyssna states that users switch between devices all day and therefore designers must create responsive interfaces that work seamlessly across mobile phones, tablets and desktops, adapting layouts and interactions accordingly:contentReference[oaicite:16]{index=16}.',
  },

  {
    id: 'ux_ui_q7',
    difficulty: 2,
    text: 'What did researchers discover about the relationship between aesthetics and perceived usability?',
    subtopic: 'Aesthetic-usability effect',
    answers: [
      {
        text: 'Participants rated aesthetically pleasing interface designs as easier to use, showing a strong correlation between visual appeal and perceived ease of use.',
        isCorrect: true,
      },
      {
        text: 'Participants rated functional but plain designs as easier to use, suggesting that aesthetics have minimal impact on perceived usability.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://lawsofux.com/aesthetic-usability-effect/',
    citation:
      'The aesthetic-usability effect describes a 1995 study in which Kurosu and Kashimura found that participants’ ratings of aesthetic appeal were strongly correlated with perceived ease of use, even though the actual usability did not change:contentReference[oaicite:17]{index=17}.',
  },
  {
    id: 'ui_p7',
    difficulty: 2,
    text: 'What is the role of white (negative) space in user interface design?',
    subtopic: 'White space',
    answers: [
      {
        text: 'White space lets elements breathe, reduces clutter and makes focal points clearer, improving readability and user focus.',
        isCorrect: true,
      },
      {
        text: 'White space should be minimized to utilize screen real estate more efficiently, especially on smaller screens where space is limited.',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://www.geeksforgeeks.org/blogs/principles-of-visual-design-that-every-ui-designer-should-know/',
    citation:
      'GeeksforGeeks notes that negative or white space is the spacing between screen elements; effective use of white space allows text and images to breathe, reducing clutter and preventing content from appearing flooded or overwhelming:contentReference[oaicite:18]{index=18}.',
  },
  {
    id: 'ux_ui_q8',
    difficulty: 3,
    text: 'How does the peak-end rule influence the way users remember an experience, and what design strategy follows from this principle?',
    subtopic: 'Cognitive bias',
    answers: [
      {
        text: 'People judge an experience largely by how they felt at its most intense point and at its end, so designers should focus on delighting users during peak moments and ensuring the experience ends positively.',
        isCorrect: true,
      },
      {
        text: 'People judge an experience mainly by its beginning and overall duration, so designers should emphasise the opening moments and the total time spent.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://lawsofux.com/peak-end-rule/',
    citation:
      'The peak-end rule notes that people judge an experience based on how they felt at its peak and at its end rather than the average of all moments; therefore designers should pay special attention to intense points and the final moments of the journey:contentReference[oaicite:19]{index=19}.',
  },
  {
    id: 'ui_p8',
    difficulty: 2,
    text: 'In the context of UI design, what does alignment refer to and why is it important for user experience?',
    subtopic: 'Alignment & hierarchy',
    answers: [
      {
        text: 'Alignment is the strategic arrangement of elements relative to one another or a common baseline; consistent alignment guides the user’s eye through content, enhances readability and creates order and harmony.',
        isCorrect: true,
      },
      {
        text: 'Creative designs sometimes offset elements from standard grids to create dynamic visual interest, even though strict alignment may be reduced.',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://www.uxpin.com/studio/blog/alignment-in-design-making-text-and-visuals-more-appealing/',
    citation:
      'The UXPin article explains that alignment involves arranging elements relative to each other or a common baseline to create order, harmony and visual appeal; mastering alignment guides the user’s eye through content, improves readability and fosters familiarity across interfaces:contentReference[oaicite:20]{index=20}:contentReference[oaicite:21]{index=21}.',
  },

  {
    id: 'ux_ui_q9',
    difficulty: 3,
    text: 'Why do operating systems often place menus or frequently used icons at the edges or corners of the screen in mouse-driven interfaces, according to Fitts’s law?',
    subtopic: 'Advanced Fitts’s law',
    answers: [
      {
        text: 'The screen edges act as infinite targets, so a user can’t overshoot them. Corners are the easiest areas to select, making menus placed there faster to reach.',
        isCorrect: true,
      },
      {
        text: 'Edges are less cluttered and keep menus away from the main content area, providing a cleaner workspace.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://dovetail.com/ux/what-is-fitts-law/',
    citation:
      'Dovetail’s explanation of Fitts’s law notes that the edges of the screen are "infinitely deep"—you can’t miss them—so corners and edges are the easiest areas to select; operating systems use this by placing menus at the top or bottom edges for easy access:contentReference[oaicite:22]{index=22}.',
  },
  {
    id: 'ui_p9',
    difficulty: 2,
    text: 'How does the principle of proximity help users understand relationships between elements in a UI?',
    subtopic: 'Proximity',
    answers: [
      {
        text: 'Proximity involves placing related elements close together and separating unrelated items with adequate spacing, helping users quickly understand which elements belong together.',
        isCorrect: true,
      },
      {
        text: 'Evenly spacing elements across the interface can create order, because it avoids crowded areas.',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://www.geeksforgeeks.org/blogs/principles-of-visual-design-that-every-ui-designer-should-know/',
    citation:
      'GeeksforGeeks states that the proximity principle groups related elements by placing them close together and separates unrelated items with spacing, enabling users to visually combine or separate information:contentReference[oaicite:23]{index=23}.',
  },
  {
    id: '1',
    difficulty: 2,
    text: 'In the Web Content Accessibility Guidelines (WCAG) 2.2 AA, what is the minimum contrast ratio required for normal text?',
    subtopic: 'Accessibility',
    answers: [
      {
        text: 'A contrast ratio of at least 4.5:1',
        isCorrect: true,
      },
      {
        text: 'A contrast ratio of at least 3:1',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html',
    citation:
      'The WCAG 2.0 explanation of Success Criterion 1.4.3 states that the visual presentation of text must have a contrast ratio of at least 4.5:1 for normal text, with a lower 3:1 ratio allowed only for large-scale text:contentReference[oaicite:0]{index=0}.',
  },
  {
    id: '2',
    difficulty: 1,
    text: 'Which of these is one of Jakob Nielsen’s 10 usability heuristics for user interface design?',
    subtopic: 'Usability heuristics',
    answers: [
      {
        text: 'Match between the system and the real world',
        isCorrect: true,
      },
      {
        text: 'Mobile-first design principle',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/Jakob_Nielsen_(usability_consultant)',
    citation:
      'Wikipedia summarises Nielsen’s list of ten usability heuristics, which includes “Match between system and the real world” among principles like visibility of system status and consistency and standards:contentReference[oaicite:1]{index=1}.',
  },
  {
    id: '3',
    difficulty: 2,
    text: 'For a lengthy, complex form, which approach helps avoid overwhelming the user?',
    subtopic: 'Interaction design',
    answers: [
      {
        text: 'Break the form into manageable steps (progressive disclosure)',
        isCorrect: true,
      },
      {
        text: 'Present all questions at once for transparency',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://design.mirakl.com/design/patterns/progressive-disclosure',
    citation:
      'The Mirakl Design pattern guide explains that for long or complex forms, designers should use steppers to break the form into smaller, manageable steps, guiding users through the process and reducing cognitive load:contentReference[oaicite:2]{index=2}.',
  },
  {
    id: '4',
    difficulty: 1,
    text: 'In artificial intelligence, what does the acronym “LLM” stand for?',
    subtopic: 'Fundamentals',
    answers: [
      {
        text: 'Large Language Model',
        isCorrect: true,
      },
      {
        text: 'Language Learning Model',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://dictionary.cambridge.org/dictionary/english/llm',
    citation:
      'The Cambridge Dictionary defines LLM (computing) as an abbreviation for “large language model,” describing it as a complex mathematical representation of language built on large amounts of data that enables computers to generate human-like language:contentReference[oaicite:3]{index=3}.',
  },
  {
    id: '5',
    difficulty: 3,
    text: 'To answer user questions with up-to-date factual accuracy, which AI approach is more suitable?',
    subtopic: 'Model behaviour',
    answers: [
      {
        text: 'Use retrieval-augmented generation (RAG)',
        isCorrect: true,
      },
      {
        text: 'Use an LLM trained on the factual data',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://blogs.nvidia.com/blog/what-is-retrieval-augmented-generation/',
    citation:
      'An NVIDIA blog explains that retrieval-augmented generation (RAG) enhances the accuracy and reliability of generative AI by fetching information from relevant data sources, filling gaps in LLM knowledge and providing authoritative, source-grounded answers:contentReference[oaicite:4]{index=4}.',
  },
  {
    id: '6',
    difficulty: 2,
    text: 'When deploying an AI agent that can perform actions autonomously, what safety measure is essential?',
    subtopic: 'AI agents & safety',
    answers: [
      {
        text: 'Human oversight or approval for high-risk actions (human-in-the-loop checkpoints)',
        isCorrect: true,
      },
      {
        text: 'Give the agent unrestricted autonomy to maximize efficiency',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://www.permit.io/blog/human-in-the-loop-for-ai-agents-best-practices-frameworks-use-cases-and-demo',
    citation:
      'Permit.io’s best-practices article notes that inserting humans at key decision points prevents irreversible mistakes and ensures accountability; an AI agent should not act until a human explicitly approves its request:contentReference[oaicite:5]{index=5}.',
  },
  {
    id: '7',
    difficulty: 2,
    text: 'Which of the following is one of Jakob Nielsen’s 10 usability heuristics for interface design?',
    subtopic: 'Usability heuristics',
    answers: [
      {
        text: 'Consistency and standards',
        isCorrect: true,
      },
      {
        text: 'User freedom',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/Jakob_Nielsen_(usability_consultant)',
    citation:
      'Nielsen’s list of ten usability heuristics includes “Consistency and standards” among other principles like error prevention and help and documentation:contentReference[oaicite:6]{index=6}.',
  },
  {
    id: '8',
    difficulty: 1,
    text: "Which approach reduces users' cognitive load when presenting information?",
    subtopic: 'Cognitive load',
    answers: [
      {
        text: 'Group related content into smaller, manageable chunks',
        isCorrect: true,
      },
      {
        text: 'Display all information at once so users can see everything',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://engineeringmanagementinstitute.org/unlocking-learning-potential-the-power-of-chunking-in-education/',
    citation:
      'The Engineering Management Institute explains that chunking involves breaking complex information into smaller, manageable units, leveraging our brain’s tendency to group data so that it’s easier to process and remember:contentReference[oaicite:7]{index=7}.',
  },
  {
    id: '9',
    difficulty: 2,
    text: 'A designer wants to remove all focus indicators from buttons to make the UI look cleaner. What is the better practice?',
    subtopic: 'Accessibility (focus)',
    answers: [
      {
        text: 'Keep a visible focus outline on interactive elements for accessibility',
        isCorrect: true,
      },
      {
        text: 'Remove focus outlines to achieve a cleaner visual design',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.a11yproject.com/posts/never-remove-css-outlines/',
    citation:
      'The A11Y Project notes that using `:focus { outline: none; }` removes any visible indication of focus for keyboard users and makes a site less accessible; designers should instead give interactive elements a visible focus indicator, either by styling the outline or the element itself:contentReference[oaicite:8]{index=8}:contentReference[oaicite:9]{index=9}.',
  },
  {
    id: '10',
    difficulty: 2,
    text: 'How should a web app handle animations for users who prefer reduced motion?',
    subtopic: 'Accessibility (motion)',
    answers: [
      {
        text: 'Provide a reduced motion mode or disable animations for those users',
        isCorrect: true,
      },
      {
        text: 'Keep all animations unchanged as long as they are brief and subtle',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.smashingmagazine.com/2021/10/respecting-users-motion-preferences/',
    citation:
      'Smashing Magazine explains that the `prefers-reduced-motion` media query allows developers to detect when users prefer reduced motion and turn off or simplify animations for them, ensuring that motion isn’t applied when a user has requested reduced motion:contentReference[oaicite:10]{index=10}.',
  },
  {
    id: '11',
    difficulty: 2,
    text: "A brand's style uses light grey text on white, failing contrast guidelines. As the designer, what is the best course of action?",
    subtopic: 'Visual design & accessibility',
    answers: [
      {
        text: 'Adjust or supplement the colours to meet contrast standards',
        isCorrect: true,
      },
      {
        text: 'Adhere to the brand colours for consistency',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://themeisle.com/blog/background-and-foreground-colors-do-not-have-a-sufficient-contrast-ratio/',
    citation:
      'A ThemeIsle article on fixing insufficient contrast explains that WCAG recommends a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text, and notes that light gray text on similar backgrounds often fails these guidelines; designers should identify low-contrast elements and adjust colours to meet the recommended contrast ratio:contentReference[oaicite:11]{index=11}.',
  },
  {
    id: '12',
    difficulty: 3,
    text: 'A redesign made users slightly slower to complete a task, but with far fewer errors. How should this outcome be interpreted?',
    subtopic: 'UX metrics',
    answers: [
      {
        text: 'Positively - improved accuracy (fewer errors) is worth a minor increase in task time',
        isCorrect: true,
      },
      {
        text: 'Negatively - any increase in user task time signals a decline in overall usability',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://measuringu.com/errors-ux/',
    citation:
      'MeasuringU notes that errors correlate with task time, completion rates and satisfaction, and that errors are often the reason behind longer task times and lower ease ratings; reducing errors can improve usability even if task times increase slightly:contentReference[oaicite:12]{index=12}.',
  },
  {
    id: '13',
    difficulty: 1,
    text: 'In the context of AI chatbots, what is a “hallucination”?',
    subtopic: 'AI reliability',
    answers: [
      {
        text: 'The AI generates a confident answer that includes false or misleading information',
        isCorrect: true,
      },
      {
        text: 'The AI becomes confused and fails to produce any response to a given prompt',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/Hallucination_(artificial_intelligence)',
    citation:
      'Wikipedia explains that in artificial intelligence, a hallucination refers to a response generated by an AI system that contains false or misleading information presented as fact, rather than a perceptual experience:contentReference[oaicite:13]{index=13}.',
  },
  {
    id: '14',
    difficulty: 1,
    text: 'What is the purpose of a “content filter” in a generative AI system?',
    subtopic: 'Content filtering',
    answers: [
      {
        text: 'To act as a barrier that blocks outputs containing disallowed or harmful content',
        isCorrect: true,
      },
      {
        text: "To speed up the AI's response generation by filtering out unimportant words",
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://medium.com/@vaidyasantosh/keeping-ai-safe-fair-and-clean-the-art-of-content-filtering-f7eba204350b',
    citation:
      'A Medium article on content filtering states that content filtering involves detecting and blocking harmful, biased or inappropriate AI outputs — like a bouncer for a chatbot — ensuring only safe, relevant responses get through:contentReference[oaicite:14]{index=14}.',
  },
  {
    id: '15',
    difficulty: 2,
    text: "Your AI assistant needs real-time stock prices to answer a query. What's the best way for it to get this information?",
    subtopic: 'Tool use',
    answers: [
      {
        text: 'Use tool calling (have the AI invoke an external API/service to fetch the current stock data)',
        isCorrect: true,
      },
      {
        text: 'Rely on pretrained knowledge to guess the stock prices from its existing data',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.apideck.com/blog/llm-tool-use-and-function-calling',
    citation:
      'Apideck’s introduction to function calling explains that tool calling allows an LLM to interact with external APIs based on the user’s input; for example, the model can call a weather API to get real-time data rather than generate a generic response:contentReference[oaicite:15]{index=15}.',
  },
  {
    id: '16',
    difficulty: 2,
    text: 'What safety measure helps prevent an AI agent from getting stuck in an endless action loop?',
    subtopic: 'AI guardrails',
    answers: [
      {
        text: 'Implement a strict limit on the number of iterations or steps the agent can perform',
        isCorrect: true,
      },
      {
        text: 'Allow the agent unlimited attempts so it can keep trying until it succeeds, no matter how long it takes',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://rwilinski.ai/posts/building-better-ai-agents-core-principles-for-success/',
    citation:
      'An article on building better AI agents recommends limiting the number of iterations and retries; if an agent is stuck in a loop, limiting its budget prevents infinite loops and stops it from repeatedly calling APIs:contentReference[oaicite:16]{index=16}.',
  },
  {
    id: '18',
    difficulty: 3,
    text: 'For a hate-speech detection AI, which approach is more crucial to minimize harm?',
    subtopic: 'AI evaluation',
    answers: [
      {
        text: 'Maximising recall - ensure virtually all hateful content is caught, even if some harmless content is mistakenly flagged',
        isCorrect: true,
      },
      {
        text: 'Maximising precision - ensure no innocent content is wrongly flagged, even if some hate speech slips through unnoticed',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://keylabs.ai/blog/precision-vs-recall-key-differences-and-use-cases/',
    citation:
      'A Keylabs article on precision vs recall notes that in domains like medical diagnostics completeness often takes precedence because missing a positive case can be critical; high recall is crucial when missing true positives is unacceptable, even though it may lead to more false alarms:contentReference[oaicite:18]{index=18}.',
  },
]

// {
//   id: 'ux_ui_q10',
//   difficulty: 5,
//   text: 'What does the Doherty threshold suggest about system response times, and how should designers manage processes that exceed this threshold?',
//   subtopic: 'Performance & feedback',
//   answers: [
//     {
//       text: 'Research by Walter J. Doherty and Arvind J. Thadani suggests that response times should be under about 400 milliseconds to keep users engaged; if tasks take longer, designers should add feedback such as loading indicators to show progress.',
//       isCorrect: true,
//     },
//     {
//       text: 'Users can tolerate a few seconds of delay if they know a complex task is being processed, so response times can be longer without providing any additional feedback.',
//       isCorrect: false,
//     },
//   ],
//   sourceUrl: 'https://qualaroo.com/blog/rules-for-ux-beginners/',
//   citation:
//     'The Qualaroo UX rules note that IBM researchers Doherty and Thadani found response times shouldn’t exceed about 400 milliseconds; designers should keep response times short and, if a process is time-consuming, provide a loading widget so users know the task is in progress:contentReference[oaicite:24]{index=24}.',
// },

// {
//   id: 'ui_w2',
//   difficulty: 1,
//   text: 'What are the three primary types of user interfaces described in the context of UI design?',
//   subtopic: 'Terminology',
//   answers: [
//     {
//       text: 'Graphical user interfaces (GUIs), voice-controlled interfaces and gesture-based interfaces.',
//       isCorrect: true,
//     },
//     {
//       text: 'Text interfaces, haptic interfaces and holographic interfaces.',
//       isCorrect: false,
//     },
//   ],
//   sourceUrl: 'https://en.wikipedia.org/wiki/User_interface_design',
//   citation:
//     'The same article notes three types of user interfaces: graphical user interfaces (where users interact with visual representations), interfaces controlled through voice (used by smart assistants), and interactive interfaces utilizing gestures (e.g., VR games):contentReference[oaicite:3]{index=3}.',
// },
