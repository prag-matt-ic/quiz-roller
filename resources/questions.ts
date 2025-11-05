import { type Question } from '@/model/schema'

export const QUESTIONS: Question[] = [
  {
    id: 'ux_ui_q1',
    difficulty: 1,
    text: 'According to Nielsen’s usability heuristics, what does the "visibility of system status" heuristic advise UI designers to do?',
    subtopic: 'Usability heuristics',
    answers: [
      {
        text: 'Keep users informed about what is happening by providing appropriate feedback within a reasonable time.',
        isCorrect: true,
      },
      {
        text: 'Minimize status updates to only critical moments to reduce distractions, even if users might occasionally feel uncertain.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.nngroup.com/articles/ten-usability-heuristics/',
    citation:
      'The Nielsen‑Norman Group states that the design should always keep users informed about what is going on through appropriate feedback; predictable feedback helps users determine next steps and builds trust:contentReference[oaicite:0]{index=0}.',
  },
  {
    id: 'ui_p1',
    difficulty: 1,
    text: 'In UI design, what does the principle of clarity and simplicity advise designers to do?',
    subtopic: 'Clarity & simplicity',
    answers: [
      {
        text: 'Keep the interface clean and straightforward with intuitive layouts, clear labels and consistent patterns so users instantly understand where to go and what to do.',
        isCorrect: true,
      },
      {
        text: 'Focus on adding only minimal decorative details while still including complex features, as some users appreciate advanced functionality even if it increases cognitive effort.',
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
        text: 'To design user interfaces for machines and software with the focus on maximizing usability and user experience by making interactions simple and efficient.',
        isCorrect: true,
      },
      {
        text: 'To prioritise visual decoration and animations over usability, assuming users will adapt to complex interactions.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/User_interface_design',
    citation:
      'The Wikipedia article states that UI design is the design of user interfaces for machines and software, focusing on maximizing usability and the user experience; it aims to make interactions simple and efficient through user‑centered design:contentReference[oaicite:2]{index=2}.',
  },
  {
    id: 'ui_w2',
    difficulty: 1,
    text: 'According to Wikipedia, what are the three primary types of user interfaces described in the context of UI design?',
    subtopic: 'Terminology',
    answers: [
      {
        text: 'Graphical user interfaces (GUIs), voice‑controlled interfaces and gesture‑based interfaces.',
        isCorrect: true,
      },
      {
        text: 'Text‑only interfaces, haptic interfaces and holographic interfaces.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/User_interface_design',
    citation:
      'The same article notes three types of user interfaces: graphical user interfaces (where users interact with visual representations), interfaces controlled through voice (used by smart assistants), and interactive interfaces utilizing gestures (e.g., VR games):contentReference[oaicite:3]{index=3}.',
  },
  {
    id: 'ux_ui_q2',
    difficulty: 1,
    text: 'Which of Jakob Nielsen’s usability heuristics urges designers to use words, phrases and concepts familiar to users and follow real‑world conventions?',
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
      'The "match between the system and the real world" heuristic advises designers to speak the users’ language and use real‑world conventions so the interface feels natural:contentReference[oaicite:4]{index=4}.',
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
    id: 'ui_w3',
    difficulty: 1,
    text: 'In the design thinking framework EDIPT mentioned on Wikipedia, what do the letters E‑D‑I‑P‑T stand for?',
    subtopic: 'Design thinking & working practices',
    answers: [
      {
        text: 'Empathize, Define, Ideate, Prototype and Test.',
        isCorrect: true,
      },
      {
        text: 'Empathize, Design, Integrate, Produce and Test.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://en.wikipedia.org/wiki/User_interface_design',
    citation:
      'The Wikipedia article notes that David M. Kelley’s design thinking framework EDIPT stands for empathize, define, ideate, prototype and test; it is a non‑linear process where designers may iterate between stages:contentReference[oaicite:6]{index=6}.',
  },

  {
    id: 'ux_ui_q3',
    difficulty: 2,
    text: 'According to Hick’s law, what happens to the decision time when the number of choices presented to a user increases?',
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
    text: 'How can visual hierarchy guide a user’s attention in a user interface?',
    subtopic: 'Visual hierarchy',
    answers: [
      {
        text: 'By using size, colour and placement to highlight the most important elements—such as call‑to‑action buttons—designers can ensure users see key information first.',
        isCorrect: true,
      },
      {
        text: 'By giving all elements equal emphasis through bright colours and bold typography, creating a uniform look that attracts attention everywhere.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.lyssna.com/blog/ui-design-principles/',
    citation:
      'Lyssna explains that visual hierarchy guides users’ attention by using size, colour and placement to highlight important elements like call‑to‑action buttons, ensuring users see what matters most at the right time:contentReference[oaicite:8]{index=8}.',
  },
  {
    id: 'ui_w4',
    difficulty: 2,
    text: 'What is the purpose of usability testing in user interface design?',
    subtopic: 'Usability testing',
    answers: [
      {
        text: 'It evaluates how users interact with an interface to identify pain points and measure how efficiently they can complete tasks, providing insight for design improvements.',
        isCorrect: true,
      },
      {
        text: 'It primarily measures aesthetic preferences by asking users to rate colours and visual styles rather than assessing task performance.',
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
    text: 'Fitts’s law is often used in interaction design to predict how quickly a user can click or tap on a target. Which two factors does Fitts’s law say primarily determine the time needed to reach a target?',
    subtopic: 'UX laws',
    answers: [
      {
        text: 'The distance to the target and the size of the target.',
        isCorrect: true,
      },
      {
        text: 'The shape and colour of the target have the greatest influence on selection speed.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://dovetail.com/ux/what-is-fitts-law/',
    citation:
      'Dovetail notes that Fitts’ law states that the time to acquire a target depends on the distance to and size of the target; larger, closer objects are easier to interact with:contentReference[oaicite:11]{index=11}.',
  },
  {
    id: 'ui_p4',
    difficulty: 2,
    text: 'What does the balance principle involve in UI design?',
    subtopic: 'Balance & composition',
    answers: [
      {
        text: 'Distributing elements evenly to create stability and harmony; symmetrical layouts have equal weight on both sides, while asymmetrical balance uses contrast, scale and positioning for a dynamic feel.',
        isCorrect: true,
      },
      {
        text: 'Clustering most interactive elements together in one area and leaving the rest of the interface largely empty can also create a balanced composition.',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://medium.com/@vpd07420boluwatimilehin/design-principles-colour-theory-and-typography-in-ui-ux-design-9dfdd953799a',
    citation:
      'The Medium article notes that balance ensures UI elements are evenly distributed to create stability and harmony; symmetrical balance arranges elements evenly around a central axis, whereas asymmetrical balance uses contrast, scale and positioning to create a dynamic but still balanced experience:contentReference[oaicite:12]{index=12}.',
  },

  {
    id: 'ux_ui_q5',
    difficulty: 3,
    text: 'In error prevention, what distinguishes a slip from a mistake according to Nielsen’s usability heuristics?',
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
    difficulty: 3,
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
    difficulty: 3,
    text: 'What does Miller’s law imply about human working memory, and how should UX designers structure information to accommodate this limitation?',
    subtopic: 'Cognitive load',
    answers: [
      {
        text: 'People can keep about seven (plus or minus two) items in working memory, so information should be organised into small, digestible chunks.',
        isCorrect: true,
      },
      {
        text: 'Working memory can handle dozens of items if the content is interesting, so designers can present long lists without organising the information.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://lawsofux.com/millers-law/',
    citation:
      'Laws of UX explains that the average person can only keep around 7±2 items in working memory and recommends organising content into smaller chunks to make it easier to process and remember:contentReference[oaicite:15]{index=15}.',
  },
  {
    id: 'ui_p6',
    difficulty: 3,
    text: 'Why is designing for responsiveness and adaptability important in modern UI design?',
    subtopic: 'Responsiveness',
    answers: [
      {
        text: 'Users switch between devices, so interfaces should adapt across mobile phones, tablets and desktops by adjusting layouts and interactions accordingly.',
        isCorrect: true,
      },
      {
        text: 'Some designers believe starting with desktop layouts and scaling down to smaller devices later is simpler and sufficient for most products.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://www.lyssna.com/blog/ui-design-principles/',
    citation:
      'Lyssna states that users switch between devices all day and therefore designers must create responsive interfaces that work seamlessly across mobile phones, tablets and desktops, adapting layouts and interactions accordingly:contentReference[oaicite:16]{index=16}.',
  },

  {
    id: 'ux_ui_q7',
    difficulty: 4,
    text: 'What did researchers Masaaki Kurosu and Kaori Kashimura discover about the relationship between aesthetics and perceived usability in their 1995 study?',
    subtopic: 'Aesthetic–usability effect',
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
      'The aesthetic‑usability effect describes a 1995 study in which Kurosu and Kashimura found that participants’ ratings of aesthetic appeal were strongly correlated with perceived ease of use, even though the actual usability did not change:contentReference[oaicite:17]{index=17}.',
  },
  {
    id: 'ui_p7',
    difficulty: 4,
    text: 'What is the role of white (negative) space in user interface design?',
    subtopic: 'White space',
    answers: [
      {
        text: 'White space refers to the empty space between elements; effective use of this negative space lets elements breathe, reduces clutter and makes focal points clearer, improving readability and user focus.',
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
    difficulty: 4,
    text: 'How does the peak–end rule influence the way users remember an experience, and what design strategy follows from this principle?',
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
      'The peak‑end rule notes that people judge an experience based on how they felt at its peak and at its end rather than the average of all moments; therefore designers should pay special attention to intense points and the final moments of the journey:contentReference[oaicite:19]{index=19}.',
  },
  {
    id: 'ui_p8',
    difficulty: 4,
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
    difficulty: 5,
    text: 'Why do operating systems often place menus or frequently used icons at the edges or corners of the screen in mouse‑driven interfaces, according to Fitts’s law?',
    subtopic: 'Advanced Fitts’s law',
    answers: [
      {
        text: 'The screen edges act as ‘infinite targets,’ so a user can’t overshoot them; corners are the easiest areas to select, making menus placed there faster to reach.',
        isCorrect: true,
      },
      {
        text: 'Edges are less cluttered and keep menus away from the main content area, providing a cleaner workspace but not necessarily improving selection speed.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://dovetail.com/ux/what-is-fitts-law/',
    citation:
      'Dovetail’s explanation of Fitts’s law notes that the edges of the screen are "infinitely deep"—you can’t miss them—so corners and edges are the easiest areas to select; operating systems use this by placing menus at the top or bottom edges for easy access:contentReference[oaicite:22]{index=22}.',
  },
  {
    id: 'ui_p9',
    difficulty: 5,
    text: 'How does the principle of proximity help users understand relationships between elements in a UI?',
    subtopic: 'Proximity',
    answers: [
      {
        text: 'Proximity involves placing related elements close together and separating unrelated items with adequate spacing, helping users quickly understand which elements belong together.',
        isCorrect: true,
      },
      {
        text: 'Evenly spacing elements across the interface can create order, even if related items are further apart, because it avoids crowded areas.',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://www.geeksforgeeks.org/blogs/principles-of-visual-design-that-every-ui-designer-should-know/',
    citation:
      'GeeksforGeeks states that the proximity principle groups related elements by placing them close together and separates unrelated items with spacing, enabling users to visually combine or separate information:contentReference[oaicite:23]{index=23}.',
  },
  {
    id: 'ux_ui_q10',
    difficulty: 5,
    text: 'What does the Doherty threshold suggest about system response times, and how should designers manage processes that exceed this threshold?',
    subtopic: 'Performance & feedback',
    answers: [
      {
        text: 'Research by Walter J. Doherty and Arvind J. Thadani suggests that response times should be under about 400 milliseconds to keep users engaged; if tasks take longer, designers should add feedback such as loading indicators to show progress.',
        isCorrect: true,
      },
      {
        text: 'Users can tolerate a few seconds of delay if they know a complex task is being processed, so response times can be longer without providing any additional feedback.',
        isCorrect: false,
      },
    ],
    sourceUrl: 'https://qualaroo.com/blog/rules-for-ux-beginners/',
    citation:
      'The Qualaroo UX rules note that IBM researchers Doherty and Thadani found response times shouldn’t exceed about 400 milliseconds; designers should keep response times short and, if a process is time‑consuming, provide a loading widget so users know the task is in progress:contentReference[oaicite:24]{index=24}.',
  },
  {
    id: 'ui_p10',
    difficulty: 5,
    text: 'According to visual design principles, how do warm and cool colours interact with different background shades to influence user attention?',
    subtopic: 'Colour psychology',
    answers: [
      {
        text: 'Warm colours stand out against dark backgrounds and appear closer, while cool colours stand out over light backgrounds; designers use these combinations to draw attention to important elements.',
        isCorrect: true,
      },
      {
        text: 'Colour choices should mainly follow brand guidelines, and background contrast is a secondary consideration when trying to draw attention to elements.',
        isCorrect: false,
      },
    ],
    sourceUrl:
      'https://www.geeksforgeeks.org/blogs/principles-of-visual-design-that-every-ui-designer-should-know/',
    citation:
      'The visual design principles article notes that warm colours stand out against dark backgrounds and appear closer, whereas cool colours stand out over light backgrounds, making them appear closer on light surfaces; designers use these colour contrasts intentionally:contentReference[oaicite:25]{index=25}.',
  },
]
