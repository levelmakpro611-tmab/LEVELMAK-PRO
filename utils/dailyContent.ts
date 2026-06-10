// Unique vocabulary and quotes for each day of the month (1 to 31)
// Guaranteed not to repeat within the same month.

export interface VocabWord {
    word: string;
    explanation: string;
    usage: string;
}

export interface MotivationQuote {
    quote: string;
    author: string;
}

export const DAILY_VOCAB: Record<string, VocabWord[][]> = {
    fr: [
        [
            { word: "Évanescent", explanation: "Qui disparaît progressivement, qui est fugace ou éphémère.", usage: "Un espoir évanescent traversa son esprit avant de s'éteindre." },
            { word: "Ineffable", explanation: "Qui ne peut être exprimé par des mots en raison de son intensité ou de sa nature.", usage: "Une joie ineffable l'envahit à l'annonce de sa réussite." }
        ],
        [
            { word: "Obséquieux", explanation: "Qui manifeste un excès de politesse ou de dévouement, souvent par intérêt.", usage: "Le courtisan adressa un salut obséquieux au souverain." },
            { word: "Versatile", explanation: "Qui change facilement d'opinion, qui est instable.", usage: "Face aux critiques, le public s'est montré particulièrement versatile." }
        ],
        [
            { word: "Zélé", explanation: "Qui montre un grand dévouement, de l'ardeur pour une cause ou un travail.", usage: "Un employé zélé accomplit toujours ses tâches avec minutie." },
            { word: "Abnégation", explanation: "Disposition à se sacrifier ou à renoncer à son intérêt personnel.", usage: "Il a fait preuve d'abnégation pour mener à bien ce projet collectif." }
        ],
        [
            { word: "Équivoque", explanation: "Qui peut s'interpréter de plusieurs manières, qui est ambigu ou suspect.", usage: "Ses explications équivoques n'ont pas convaincu l'auditoire." },
            { word: "Soliloque", explanation: "Discours qu'une personne se tient à elle-même.", usage: "Il se laissa aller à un long soliloque dans le silence de sa chambre." }
        ],
        [
            { word: "Contingent", explanation: "Qui peut se produire ou non, qui n'est pas nécessaire.", usage: "Les événements contingents de l'histoire modifient parfois le futur." },
            { word: "Intempestif", explanation: "Qui se produit à contretemps, qui est déplacé ou inopportun.", usage: "Une coupure de courant intempestive interrompit la conférence." }
        ],
        [
            { word: "Magnanime", explanation: "Qui a de la grandeur d'âme, qui est enclin au pardon et à la générosité.", usage: "Le vainqueur se montra magnanime envers ses adversaires." },
            { word: "Obsolescence", explanation: "Fait de devenir périmé ou dépassé en raison du progrès technique.", usage: "L'obsolescence programmée des smartphones est souvent critiquée." }
        ],
        [
            { word: "Protéiforme", explanation: "Qui peut prendre des formes multiples ou variées.", usage: "L'art contemporain se caractérise par son aspect protéiforme." },
            { word: "Véhément", explanation: "Qui s'exprime avec une grande force, de l'ardeur ou de la violence.", usage: "Il prononça un discours véhément pour défendre ses convictions." }
        ],
        [
            { word: "Idiosyncrasie", explanation: "Comportement ou particularité propre à un individu.", usage: "Chaque artiste possède une idiosyncrasie qui le rend unique." },
            { word: "Épicurien", explanation: "Qui sait apprécier les plaisirs simples et sains de la vie.", usage: "C'est un épicurien qui aime partager de bons repas en famille." }
        ],
        [
            { word: "Belliqueux", explanation: "Qui aime la guerre, les querelles ou qui cherche le conflit.", usage: "Son ton belliqueux a rapidement envenimé la discussion." },
            { word: "Taciturne", explanation: "Qui parle peu, qui est renfermé ou silencieux.", usage: "Ce personnage taciturne préférait observer plutôt que d'intervenir." }
        ],
        [
            { word: "Prolixe", explanation: "Qui utilise trop de mots, qui est trop long dans ses discours.", usage: "L'orateur prolixe lassa rapidement son public." },
            { word: "Laconique", explanation: "Qui s'exprime en peu de mots, qui est bref et concis.", usage: "Il envoya un message laconique pour confirmer son arrivée." }
        ],
        [
            { word: "Antienne", explanation: "Refrain ou discours répété de façon lassante.", usage: "Elle répète toujours la même antienne sur le manque de temps." },
            { word: "Apathie", explanation: "Absence d'énergie, d'émotion ou d'intérêt pour ce qui entoure.", usage: "L'apathie des élèves inquiétait le professeur." }
        ],
        [
            { word: "Altruisme", explanation: "Disposition à s'intéresser et à se dévouer à autrui.", usage: "Son altruisme naturel le pousse à s'engager dans l'humanitaire." },
            { word: "Outrecuidance", explanation: "Confiance excessive en soi-même, audace présomptueuse.", usage: "Il a eu l'outrecuidance de contredire l'expert sans preuve." }
        ],
        [
            { word: "Pléthore", explanation: "Abondance excessive de quelque chose.", usage: "Il y avait une pléthore de candidats pour ce poste unique." },
            { word: "Indigent", explanation: "Qui manque des choses les plus nécessaires à la vie.", usage: "Cette association vient en aide aux familles indigentes." }
        ],
        [
            { word: "Parangon", explanation: "Modèle parfait, exemple suprême d'une qualité.", usage: "Il est considéré comme un parangon de vertu et de droiture." },
            { word: "Tergiverser", explanation: "Éviter de prendre une décision claire en utilisant des faux-fuyants.", usage: "Arrête de tergiverser et choisis ton orientation scolaire." }
        ],
        [
            { word: "Exhumer", explanation: "Retirer de l'oubli, remettre au jour.", usage: "L'historien a exhumé des documents inédits du XIXe siècle." },
            { word: "Réhabiliter", explanation: "Rétablir quelqu'un dans ses droits, son estime ou sa réputation.", usage: "Ce film cherche à réhabiliter un savant longtemps ignoré." }
        ],
        [
            { word: "Chimère", explanation: "Projet séduisant mais irréalisable, illusion.", usage: "Poursuivre la richesse facile est souvent une chimère dangereuse." },
            { word: "Stupéfaction", explanation: "Sensation d'étonnement si profond qu'elle empêche de réagir.", usage: "La nouvelle de sa victoire provoqua une immense stupéfaction." }
        ],
        [
            { word: "Éthéré", explanation: "Qui est d'une nature extrêmement délicate, presque céleste.", usage: "Une musique éthérée résonnait doucement dans la cathédrale." },
            { word: "Onirique", explanation: "Qui semble sorti d'un rêve.", usage: "Le réalisateur a créé une atmosphère onirique dans son dernier film." }
        ],
        [
            { word: "Suranné", explanation: "Qui a vieilli, qui appartient à une époque révolue.", usage: "Il s'exprime avec un charme suranné très apprécié." },
            { word: "Désuet", explanation: "Qui est tombé en désuétude, qui n'est plus en usage.", usage: "Ce mot désuet a été retiré des dictionnaires modernes." }
        ],
        [
            { word: "Exhaustif", explanation: "Qui traite un sujet complètement, sans rien omettre.", usage: "Il a rédigé un rapport exhaustif sur l'état de l'éducation." },
            { word: "Lésiner", explanation: "Épargner de façon mesquine, être trop économe.", usage: "Il ne faut pas lésiner sur les efforts pour réussir tes examens." }
        ],
        [
            { word: "Digression", explanation: "Action de s'écarter du sujet principal dans un discours.", usage: "Après une courte digression, le professeur revint à sa leçon." },
            { word: "Opprobre", explanation: "Honte publique ou désapprobation générale jetée sur quelqu'un.", usage: "Il a subi l'opprobre général après la révélation de sa triche." }
        ],
        [
            { word: "Équanimité", explanation: "Égalité d'humeur, sérénité constante face aux épreuves.", usage: "Le sage accueille les bonnes et mauvaises nouvelles avec équanimité." },
            { word: "Mansuétude", explanation: "Disposition à pardonner, douceur indulgente.", usage: "Le juge fit preuve d'une grande mansuétude envers le jeune prévenu." }
        ],
        [
            { word: "Cabalistique", explanation: "Qui est mystérieux, obscur ou incompréhensible.", usage: "Il écrivit quelques notes cabalistiques sur son carnet." },
            { word: "Abscons", explanation: "Difficile à comprendre, obscur ou mystérieux.", usage: "Ce traité philosophique est rédigé dans un style très abscons." }
        ],
        [
            { word: "Contingence", explanation: "Événement imprévisible qui peut modifier les plans.", usage: "Il faut prévoir les contingences pour réussir l'organisation du voyage." },
            { word: "Épistémologie", explanation: "Étude critique des sciences et de la connaissance scientifique.", usage: "L'épistémologie cherche à comprendre comment se forment les théories." }
        ],
        [
            { word: "Délétère", explanation: "Qui nuit à la santé ou à l'esprit, nuisible.", usage: "Une ambiance délétère régnait dans la classe avant l'examen." },
            { word: "Pusillanime", explanation: "Qui manque d'audace, qui craint le risque ou les responsabilités.", usage: "Une décision pusillanime qui évite de trancher les vrais problèmes." }
        ],
        [
            { word: "Sagacité", explanation: "Pénétration d'esprit, finesse et vivacité de l'intelligence.", usage: "Sa sagacité lui a permis de résoudre cette énigme complexe." },
            { word: "Perspicacité", explanation: "Qualité d'un esprit lucide qui saisit ce qui échappe aux autres.", usage: "Il a analysé la situation économique avec beaucoup de perspicacité." }
        ],
        [
            { word: "Factice", explanation: "Qui n'est pas naturel, qui est artificiel ou faux.", usage: "Elle affichait un enthousiasme factice devant ses invités." },
            { word: "Subreptice", explanation: "Qui se fait furtivement, à l'insu de quelqu'un et de façon illicite.", usage: "Il jeta un regard subreptice sur les notes de son voisin." }
        ],
        [
            { word: "Réticent", explanation: "Qui hésite à dire ou à faire quelque chose.", usage: "Il s'est montré réticent à partager ses secrets de révision." },
            { word: "Parcimonie", explanation: "Épargne minutieuse, fait de donner peu.", usage: "Les récompenses en LevelCoins sont distribuées avec parcimonie." }
        ],
        [
            { word: "Jocrisse", explanation: "Personnage niais, ridicule ou crédule.", usage: "Ne te comporte pas comme un jocrisse face à tes enseignants." },
            { word: "Truculent", explanation: "Qui a une couleur locale pittoresque, qui est haut en couleur.", usage: "L'écrivain a brossé le portrait truculent d'un vieux sage guinéen." }
        ],
        [
            { word: "Ubiquité", explanation: "Faculté d'être présent en plusieurs lieux en même temps.", usage: "Le professeur ne possède pas le don d'ubiquité dans la classe." },
            { word: "Quintessence", explanation: "Ce qu'il y a de meilleur, de plus raffiné dans une chose.", usage: "Ce livre est la quintessence du savoir mathématique de l'auteur." }
        ],
        [
            { word: "Ostentatoire", explanation: "Qui est fait avec un étalage excessif, pour attirer l'attention.", usage: "Il portait une montre en or de manière très ostentatoire." },
            { word: "Vergogne", explanation: "Honte ou pudeur morale.", usage: "Il a menti effrontément et sans aucune vergogne devant tout le monde." }
        ]
    ],
    en: [
        [
            { word: "Evanescent", explanation: "Soon passing out of sight, memory, or existence; quickly fading.", usage: "An evanescent hope crossed his mind before disappearing." },
            { word: "Ineffable", explanation: "Too great or extreme to be expressed or described in words.", usage: "An ineffable joy filled her heart upon receiving the news." }
        ],
        [
            { word: "Obsequious", explanation: "Obedient or attentive to an excessive or servile degree.", usage: "The server offered an obsequious bow to the royal guests." },
            { word: "Versatile", explanation: "Able to adapt or be adapted to many different functions or activities.", usage: "A versatile study strategy adapts easily to different subjects." }
        ],
        [
            { word: "Zealous", explanation: "Having or showing great energy or enthusiasm in pursuit of a cause.", usage: "A zealous student never misses an opportunity to learn." },
            { word: "Abnegation", explanation: "The act of renouncing or rejecting something; self-denial.", usage: "His abnegation in favoring group success over personal glory was noble." }
        ],
        [
            { word: "Equivocal", explanation: "Open to more than one interpretation; ambiguous.", usage: "The test results were equivocal, requiring a second analysis." },
            { word: "Soliloquy", explanation: "An act of speaking one's thoughts aloud when by oneself.", usage: "The character’s soliloquy revealed his inner fears." }
        ],
        [
            { word: "Contingent", explanation: "Subject to chance; occurring or existing only if certain circumstances are the case.", usage: "Our outdoor study session is contingent on the weather." },
            { word: "Untimely", explanation: "Happening or done at an unsuitable time; premature.", usage: "An untimely power outage interrupted the online exam." }
        ],
        [
            { word: "Magnanimous", explanation: "Generous or forgiving, especially toward a rival or less powerful person.", usage: "She was magnanimous in victory, praising her opponent." },
            { word: "Obsolescence", explanation: "The process of becoming obsolete or outdated.", usage: "Technological obsolescence affects old computers quickly." }
        ],
        [
            { word: "Protean", explanation: "Tending or able to change frequently or easily; versatile.", usage: "AI technology is protean, finding uses in every industry." },
            { word: "Vehement", explanation: "Showing strong feeling; forceful, passionate, or intense.", usage: "He made a vehement defense of his original essay." }
        ],
        [
            { word: "Idiosyncrasy", explanation: "A mode of behavior or way of thought peculiar to an individual.", usage: "Every programmer has an idiosyncrasy in their coding style." },
            { word: "Epicurean", explanation: "Devoted to the pursuit of sensual pleasure, especially to the enjoyment of good food.", usage: "They enjoyed an epicurean feast of traditional cuisine." }
        ],
        [
            { word: "Bellicose", explanation: "Demonstrating aggression and willingness to fight.", usage: "His bellicose attitude made classroom debates difficult." },
            { word: "Taciturn", explanation: "Reserved or uncommunicative in speech; saying little.", usage: "A taciturn scholar who preferred reading to speaking." }
        ],
        [
            { word: "Prolix", explanation: "Using or containing too many words; tediously lengthy.", usage: "The prolix lecture had students struggling to stay awake." },
            { word: "Laconic", explanation: "Using very few words; brief and to the point.", usage: "She gave a laconic reply that answered everything." }
        ],
        [
            { word: "Refrain", explanation: "A repeated comment or complaint.", usage: "The constant refrain of having too much homework." },
            { word: "Apathy", explanation: "Lack of interest, enthusiasm, or concern.", usage: "Student apathy can be solved by interactive learning tools." }
        ],
        [
            { word: "Altruism", explanation: "The belief in or practice of disinterested and selfless concern for the well-being of others.", usage: "Volunteering to tutor younger peers is a great act of altruism." },
            { word: "Presumption", explanation: "Behavior perceived as arrogant, disrespectful, or going beyond what is permitted.", usage: "He had the presumption to challenge the professor's grade." }
        ],
        [
            { word: "Plethora", explanation: "A large or excessive amount of something.", usage: "The library offers a plethora of educational materials." },
            { word: "Indigent", explanation: "Poor; needy.", usage: "The charity provides free textbooks to indigent students." }
        ],
        [
            { word: "Paragon", explanation: "A person or thing regarded as a perfect example of a particular quality.", usage: "She is a paragon of dedication and academic excellence." },
            { word: "Tergiversate", explanation: "Make conflicting or evasive statements; equivocate.", usage: "Do not tergiversate when asked simple questions by your teacher." }
        ],
        [
            { word: "Exhume", explanation: "Bring to light; revive.", usage: "The historian exhumed ancient letters from the archive." },
            { word: "Rehabilitate", explanation: "Restore someone to former privileges or reputation.", usage: "The clean report rehabilitated the student's academic standing." }
        ],
        [
            { word: "Chimera", explanation: "A thing that is hoped or wished for but in fact is illusory or impossible.", usage: "Aiming for perfection without practice is a mere chimera." },
            { word: "Astonishment", explanation: "Great surprise or wonder.", usage: "To his astonishment, he won first place in the contest." }
        ],
        [
            { word: "Ethereal", explanation: "Extremely delicate and light in a way that seems too perfect for this world.", usage: "The ethereal glow of the sunset over the campus was beautiful." },
            { word: "Oniric", explanation: "Of or relating to dreams.", usage: "The book's illustrations created an oniric world." }
        ],
        [
            { word: "Outdated", explanation: "Old-fashioned or out of date.", usage: "Using outdated methods slows down your research." },
            { word: "Obsolete", explanation: "No longer produced or used; out of date.", usage: "Paper maps have become mostly obsolete due to GPS apps." }
        ],
        [
            { word: "Exhaustive", explanation: "Fully comprehensive; examining all elements.", usage: "She conducted an exhaustive search of all sources." },
            { word: "Skimp", explanation: "Expend less time, money, or effort on something than is necessary.", usage: "Do not skimp on sleep before a major exam." }
        ],
        [
            { word: "Digression", explanation: "A temporary departure from the main subject in speech or writing.", usage: "A brief digression about history helped explain the literature." },
            { word: "Opprobrium", explanation: "Harsh criticism or public disgrace.", usage: "Cheating brought immediate opprobrium from teachers and peers." }
        ],
        [
            { word: "Equanimity", explanation: "Mental calmness, composure, and evenness of temper, especially in a difficult situation.", usage: "She accepted both praise and criticism with equal equanimity." },
            { word: "Indulgence", explanation: "An attitude of tolerance, forgiveness, or leniency.", usage: "The principal showed indulgence to the student's mistake." }
        ],
        [
            { word: "Cablistic", explanation: "Mysterious or occult.", usage: "Ancient cabalistic symbols carved into the stone wall." },
            { word: "Abstruse", explanation: "Difficult to understand; obscure.", usage: "The textbook's chapter on quantum physics was too abstruse." }
        ],
        [
            { word: "Contingency", explanation: "A future event or circumstance which is possible but cannot be predicted with certainty.", usage: "We prepared a contingency plan in case of technical issues." },
            { word: "Epistemology", explanation: "The theory of knowledge, especially with regard to its methods and scope.", usage: "Epistemology explores the boundary between belief and truth." }
        ],
        [
            { word: "Deleterious", explanation: "Causing harm or damage.", usage: "Lack of sleep has a deleterious effect on test performance." },
            { word: "Pusillanimous", explanation: "Showing a lack of courage or determination; timid.", usage: "A pusillanimous response that avoided addressing the real issue." }
        ],
        [
            { word: "Sagacity", explanation: "The quality of being sagacious; keen mental discernment and soundness of judgment.", usage: "Her sagacity helped her choose the perfect project topic." },
            { word: "Perspicacity", explanation: "The quality of having a ready insight into things; shrewdness.", usage: "His perspicacity allowed him to spot error patterns instantly." }
        ],
        [
            { word: "Factitious", explanation: "Artificially created or developed.", usage: "The dispute was factitious, engineered to create drama." },
            { word: "Subreptitious", explanation: "Obtained or done by stealth or secret.", usage: "He stole a subreptitious glance at his phone during class." }
        ],
        [
            { word: "Reticent", explanation: "Not revealing one's thoughts or feelings readily.", usage: "She was reticent about her plans after graduation." },
            { word: "Parsimony", explanation: "Extreme unwillingness to spend money or use resources.", usage: "The school's parsimony led to a shortage of new computers." }
        ],
        [
            { word: "Simpleton", explanation: "A foolish or gullible person.", usage: "Do not act like a simpleton when presenting your thesis." },
            { word: "Truculent", explanation: "Eager or quick to argue or fight; aggressively defiant.", usage: "His truculent attitude led to arguments with classmates." }
        ],
        [
            { word: "Ubiquity", explanation: "The state of being everywhere at once; omnipresence.", usage: "Mobile phones have achieved complete ubiquity in modern life." },
            { word: "Quintessence", explanation: "The most perfect or typical example of a quality or class.", usage: "This library is the quintessence of learning and quiet study." }
        ],
        [
            { word: "Ostentatious", explanation: "Characterized by vulgar or pretentious display; designed to impress or attract notice.", usage: "An ostentatious display of wealth that alienated his friends." },
            { word: "Vergogne", explanation: "Lack of shame; shamelessness.", usage: "He lied to the teachers without any vergogne or hesitation." }
        ]
    ],
    ar: [
        [
            { word: "متلاشٍ", explanation: "يتلاشى بسرعة؛ يختفي تدريجياً من الوجود.", usage: "عبر ذهنه أمل متلاشٍ قبل أن ينطفئ تماماً." },
            { word: "لا يوصف", explanation: "أعظم أو أشد من أن يعبر عنه بالكلمات.", usage: "غمرتها فرحة لا توصف عند سماعها بنبأ نجاحها." }
        ],
        [
            { word: "متزلف", explanation: "مفرط في التأدب أو التملق، غالباً لتحقيق مصلحة.", usage: "ألقى التابع تحية متزلفة على الحاكم." },
            { word: "متقلب", explanation: "يغير رأيه بسهولة؛ غير مستقر.", usage: "أظهر الجمهور تقلباً ملحوظاً في آرائه تجاه العرض." }
        ],
        [
            { word: "غيور", explanation: "يظهر حماساً كبيراً وتفانياً في العمل أو القضية.", usage: "الطالب الغيور يسعى دائماً لاغتنام فرص التعلم." },
            { word: "نكران الذات", explanation: "الاستعداد للتضحية بالمصالح الشخصية من أجل الصالح العام.", usage: "أظهر نكراناً للذات كبيراً لضمان نجاح المشروع الجماعي." }
        ],
        [
            { word: "غامض", explanation: "يحتمل تفسيرات متعددة؛ ملتبس أو مشبوه.", usage: "لم تكن إجاباته الغامضة مقنعة للحاضرين." },
            { word: "مناجاة النفس", explanation: "حديث الشخص مع نفسه بصوت مسموع.", usage: "دخل في مناجاة طويلة مع نفسه في هدوء غرفته." }
        ],
        [
            { word: "عارض", explanation: "محتمل الحدوث أو عدم الحدوث؛ ليس ضرورياً بطبيعته.", usage: "الأحداث العارضة في التاريخ قد تغير مجرى المستقبل." },
            { word: "غير مناسب", explanation: "يحدث في وقت غير مناسب؛ سابق لأوانه.", usage: "قاطع المؤتمر انقطاع مفاجئ وغير مناسب للتيار الكهربائي." }
        ],
        [
            { word: "كريم النفس", explanation: "يتصف بنبل الأخلاق والميل للمسامحة والسخاء.", usage: "أظهر الفائز نبل وكرم نفس تجاه منافسيه." },
            { word: "التقادم", explanation: "أن يصبح الشيء قديماً أو متجاوزاً بسبب التطور التقني.", usage: "يواجه مستخدمو الأجهزة القديمة مشكلة التقادم السريع." }
        ],
        [
            { word: "متنوع الأشكال", explanation: "القدرة على اتخاذ أشكال متعددة ومتنوعة بسهولة.", usage: "يتميز الفن المعاصر بطابعه المتنوع والمتغير باستمرار." },
            { word: "شديد", explanation: "يعبر عن رأيه بقوة أو حماسة بالغة.", usage: "ألقى دفاعاً شديداً عن أطروحته أمام اللجنة." }
        ],
        [
            { word: "خصوصية المزاج", explanation: "سلوك أو ميزة خاصة ينفرد بها شخص معين.", usage: "لكل كاتب خصوصية مزاج تميز أسلوبه الأدبي." },
            { word: "أبيقوري", explanation: "شخص يعرف كيف يستمتع بملذات الحياة البسيطة والذكية.", usage: "إنه أبيقوري يحب مشاركة وجبات الطعام اللذيذة مع عائلته." }
        ],
        [
            { word: "عدائي", explanation: "يميل للخصومة أو يبحث عن المشاكل والنقاشات الحادة.", usage: "أدى أسلوبه العدائي إلى إفساد الحوار سريعاً." },
            { word: "كتوم", explanation: "قليل الكلام؛ يفضل الصمت والانعزال.", usage: "فضل العالم الكتوم مراقبة التجربة في صمت بدلاً من الحديث." }
        ],
        [
            { word: "إسهابي", explanation: "يستخدم كلمات كثيرة جداً؛ يطيل الحديث بلا طائل.", usage: "سرعان ما مل الجمهور من حديث المتحدث الإسهابي." },
            { word: "اقتضابي", explanation: "يعبر عن المعنى بأقل كلمات ممكنة؛ موجز ومباشر.", usage: "أرسل رداً اقتضابياً يؤكد فيه موعد وصوله." }
        ],
        [
            { word: "لازمة", explanation: "عبارة أو فكرة تتكرر بشكل ممل.", usage: "تكرر دائماً اللازمة نفسها حول ضيق الوقت وصعوبة المواد." },
            { word: "اللامبالاة", explanation: "غياب الحماس، الطاقة أو الاهتمام بما يحيط بالمرء.", usage: "يقلق المعلم من حالة اللامبالاة التي تظهر على بعض الطلاب." }
        ],
        [
            { word: "الإيثار", explanation: "حب الخير للآخرين والسعي لمساعدتهم دون انتظار مقابل.", usage: "يدفعه الإيثار الفطري للتطوع لتعليم الأطفال مجاناً." },
            { word: "الادعاء", explanation: "ثقة زائدة بالنفس تصل إلى حد الغرور وتجاوز الحدود.", usage: "كان لديه الادعاء الكافي لمعارضة رأي الأستاذ دون دليل." }
        ],
        [
            { word: "وفرة مفرطة", explanation: "وجود كمية زائدة جداً من شيء ما.", usage: "كانت هناك وفرة مفرطة من الكتب والمصادر في المكتبة." },
            { word: "عاجز", explanation: "يفتقر إلى ضروريات الحياة الأساسية.", usage: "تقدم المؤسسة يد العون للأسر العاجزة والمحتاجة." }
        ],
        [
            { word: "قدوة", explanation: "نموذج مثالي يحتذى به في الأخلاق أو المهارة.", usage: "تعتبر الطالبة قدوة في الانضباط والتميز الدراسي." },
            { word: "المراوغة", explanation: "تجنب اتخاذ قرار واضح باستخدام الأعذار والتأجيل.", usage: "توقف عن المراوغة واختر تخصصك الجامعي الآن." }
        ],
        [
            { word: "ينبش", explanation: "يخرج الشيء من طيات النسيان؛ يعيده للضوء.", usage: "نبش المؤرخ وثائق قديمة لم تنشر من قبل." },
            { word: "رد الاعتبار", explanation: "إعادة الحق أو التقدير أو السمعة الطيبة لشخص ما.", usage: "سعى التقرير الجديد لرد الاعتبار للعالم المظلوم." }
        ],
        [
            { word: "وهم", explanation: "مشروع أو رغبة جذابة لكنها مستحيلة التحقيق في الواقع.", usage: "السعي وراء الثراء السريع دون عمل ليس سوى وهم." },
            { word: "ذهول", explanation: "دهشة شديدة تمنع المرء من التفاعل أو الكلام.", usage: "أثارت نتيجة الاختبار ذهول الجميع بسبب تميزها." }
        ],
        [
            { word: "أثيري", explanation: "يتصف برقة شديدة وجمال روحي يشبه السماء.", usage: "عزفت مقطوعة أثيرية هادئة في أرجاء القاعة." },
            { word: "حلمي", explanation: "يبدو كأنه جزء من حلم أو خيال.", usage: "صنع المخرج جواً حلمياً ساحراً في فيلمه الجديد." }
        ],
        [
            { word: "عتيق", explanation: "ينتمي لحقبة زمنية ماضية وله رونق خاص.", usage: "يتحدث المعلم بأسلوب عتيق ومحبب لدى الجميع." },
            { word: "مهجور", explanation: "لم يعد مستخدماً؛ سقط من الاستعمال العام.", usage: "هناك كلمات مهجورة تمت إزالتها من القواميس الحديثة." }
        ],
        [
            { word: "شامل", explanation: "يعالج الموضوع بالكامل دون إغفال أي تفاصيل.", usage: "أعد الطالب بحثاً شاملاً حول تاريخ الرياضيات." },
            { word: "يبخل", explanation: "التقتير أو توفير الجهد والمال بشكل زائد عن اللزوم.", usage: "لا تبخل بجهدك وقت المراجعة لضمان أفضل النتائج." }
        ],
        [
            { word: "استطراد", explanation: "الخروج عن الموضوع الأصلي أثناء الحديث أو الكتابة.", usage: "بعد استطراد قصير لشرح القصة، عاد الأستاذ إلى الدرس." },
            { word: "عار", explanation: "خزي عام أو انتقاد شديد يوجه لشخص ما.", usage: "لحق به العار بعد اكتشاف محاولته للغش في الامتحان." }
        ],
        [
            { word: "رباطة جأش", explanation: "هدوء النفس وثباتها في مواجهة الصعاب والمفاجآت.", usage: "يواجه القائد الأزمات برباطة جأش وثبات تام." },
            { word: "تسامح", explanation: "الميل للمسامحة واللين مع الآخرين عند الخطأ.", usage: "أظهر المدير تسامحاً كبيراً مع خطأ الطالب الأول." }
        ],
        [
            { word: "غموض", explanation: "يتصف بالخفاء والغموض وصعوبة الفهم.", usage: "كتب عبارات غامضة على حاشية كتابه القديم." },
            { word: "مستغلق", explanation: "يصعب فهمه أو استيعابه لعمقه أو تعقيده.", usage: "كانت لغة هذا الكتاب مستغلقة على القارئ العادي." }
        ],
        [
            { word: "طوارئ", explanation: "أحداث غير متوقعة قد تستدعي تغيير الخطط.", usage: "يجب إعداد خطة للطوارئ لضمان نجاح الرحلة المدرسية." },
            { word: "نظرية المعرفة", explanation: "دراسة نقدية للمعرفة العلمية وحدودها وطرقها.", usage: "تبحث نظرية المعرفة في كيفية تشكل النظريات العلمية." }
        ],
        [
            { word: "ضار", explanation: "يسبب الأذى أو التلف للعقل أو الجسد.", usage: "السهر الطويل له أثر ضار جداً على التركيز أثناء الاختبار." },
            { word: "جبان", explanation: "يفتقر إلى الشجاعة ويخشى تحمل المسؤولية.", usage: "كان قراراً جباناً تجنب حل المشكلة الأساسية واكتفى بالتأجيل." }
        ],
        [
            { word: "حصافة", explanation: "حكمة وسداد في الرأي؛ رجاحة عقل وقدرة على التمييز.", usage: "ساعدتها حصافتها في اختيار التخصص الدراسي الأنسب لها." },
            { word: "فطنة", explanation: "قدرة ذهنية سريعة على إدراك الأمور وخفاياها.", usage: "تميز بفطنة عالية مكنته من حل اللغز الرياضي سريعاً." }
        ],
        [
            { word: "مصطنع", explanation: "غير طبيعي؛ تم صنعه أو تطويره بشكل غير تلقائي.", usage: "أظهر حماساً مصطنعاً عند استقبال الضيوف." },
            { word: "خلسة", explanation: "يحدث خفية ودون انتباه الآخرين وبشكل غير قانوني.", usage: "ألقى نظرة خلسة على ورقة زميله أثناء الامتحان." }
        ],
        [
            { word: "متحفظ", explanation: "متردد في التعبير عن آرائه أو مشاعره.", usage: "أظهر تحفظاً في الحديث عن خططه المستقبلية." },
            { word: "تقتير", explanation: "حرص شديد وبخل في استخدام الموارد والمال.", usage: "يتم توزيع المكافآت والجوائز بتقتير شديد لزيادة التنافس." }
        ],
        [
            { word: "سلس", explanation: "سهل الانقياد أو التصديق؛ ساذج.", usage: "لا تكن سلساً يسهل خداعه في الأمور المصيرية." },
            { word: "عدواني", explanation: "سريع الغضب أو يميل إلى النقاشات العنيفة والشجار.", usage: "أدى سلوكه العدواني إلى خلافات مستمرة مع زملائه." }
        ],
        [
            { word: "كلي الوجود", explanation: "القدرة على التواجد في كل مكان في نفس الوقت.", usage: "لا يملك المعلم قدرة كلي الوجود لمراقبة كل الطلاب معاً." },
            { word: "خلاصة", explanation: "أفضل وأصفى ما في الشيء من صفات أو معرفة.", usage: "يعتبر هذا الكتاب خلاصة ما توصل إليه العلم في مجاله." }
        ],
        [
            { word: "مبهرج", explanation: "يتم بهدف لفت الانتباه والظهور بمظهر مبالغ فيه.", usage: "كان يرتدي ملابس مبهرجة لجلب الأنظار إليه في المدرسة." },
            { word: "وقاحة", explanation: "انعدام الحياء والأدب الأخلاقي.", usage: "كذب أمام الجميع بكل وقاحة ودون أي شعور بالذنب." }
        ]
    ]
};

export const DAILY_MOTIVATION: Record<string, MotivationQuote[]> = {
    fr: [
        { quote: "Le succès n'est pas la fin, l'échec n'est pas fatal : c'est le courage de continuer qui compte.", author: "Winston Churchill" },
        { quote: "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre.", author: "Albert Einstein" },
        { quote: "Cela semble toujours impossible jusqu'à ce qu'on le fasse.", author: "Nelson Mandela" },
        { quote: "Le plus grand secret du bonheur, c'est d'être bien avec soi-même.", author: "Socrate" },
        { quote: "Crois en toi et tu seras invincible.", author: "Anonyme" },
        { quote: "Le succès, c'est d'aller d'échec en échec sans perdre son enthousiasme.", author: "Winston Churchill" },
        { quote: "Il n'y a qu'une façon d'échouer, c'est d'abandonner avant d'avoir réussi.", author: "Georges Clemenceau" },
        { quote: "La seule limite à notre épanouissement de demain sera nos doutes d'aujourd'hui.", author: "Franklin D. Roosevelt" },
        { quote: "Le bonheur n'est pas quelque chose de tout fait. Il vient de vos propres actions.", author: "Dalaï Lama" },
        { quote: "Ce que l'esprit peut concevoir et croire, il peut l'accomplir.", author: "Napoleon Hill" },
        { quote: "Exige beaucoup de toi-même et attends peu des autres.", author: "Confucius" },
        { quote: "Agis comme s'il était impossible d'échouer.", author: "Winston Churchill" },
        { quote: "La meilleure façon de prédire l'avenir est de le créer.", author: "Peter Drucker" },
        { quote: "Rien de grand ne s'est accompli dans le monde sans passion.", author: "Hegel" },
        { quote: "Fais de ta vie un rêve, et d'un rêve une réalité.", author: "Antoine de Saint-Exupéry" },
        { quote: "Chaque difficulté rencontrée doit être une occasion de plus pour progresser.", author: "Pierre de Coubertin" },
        { quote: "Le secret du changement, c'est de concentrer toute votre énergie non pas à lutter contre le passé, mais à construire le futur.", author: "Socrate" },
        { quote: "Les détails font la perfection, et la perfection n'est pas un détail.", author: "Léonard de Vinci" },
        { quote: "Vis comme si tu devais mourir demain. Apprends comme si tu devais vivre toujours.", author: "Mahatma Gandhi" },
        { quote: "Le courage n'est pas l'absence de peur, mais la capacité de la vaincre.", author: "Nelson Mandela" },
        { quote: "La persévérance, c'est ce qui rend l'impossible possible.", author: "Anonyme" },
        { quote: "Le succès n'est pas la clé du bonheur. Le bonheur est la clé du succès.", author: "Albert Schweitzer" },
        { quote: "Se réunir est un début ; rester ensemble est un progrès ; travailler ensemble est la réussite.", author: "Henry Ford" },
        { quote: "Ne jugez pas chaque jour à la récolte que vous faites mais aux graines que vous semez.", author: "Robert Louis Stevenson" },
        { quote: "Le seul moyen de faire du bon travail est d'aimer ce que vous faites.", author: "Steve Jobs" },
        { quote: "La simplicité est la sophistication suprême.", author: "Léonard de Vinci" },
        { quote: "Commencez là où vous êtes. Utilisez ce que vous avez. Faites ce que vous pouvez.", author: "Arthur Ashe" },
        { quote: "Les opportunités ne se produisent pas, vous les créez.", author: "Chris Grosser" },
        { quote: "La motivation vous fait démarrer, l'habitude vous fait continuer.", author: "Jim Ryun" },
        { quote: "Rien n'est impossible, le mot lui-même dit 'Je suis possible' !", author: "Audrey Hepburn" },
        { quote: "L'éducation est l'arme la plus puissante pour changer le monde.", author: "Nelson Mandela" }
    ],
    en: [
        { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { quote: "Life is like riding a bicycle. To keep your balance, you must keep moving.", author: "Albert Einstein" },
        { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
        { quote: "The greatest secret to happiness is to be at peace with oneself.", author: "Socrates" },
        { quote: "Believe in yourself and you will be invincible.", author: "Anonymous" },
        { quote: "Success is stumbling from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
        { quote: "There is only one way to fail, and that is to quit before you succeed.", author: "Georges Clemenceau" },
        { quote: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
        { quote: "Happiness is not something ready-made. It comes from your own actions.", author: "Dalai Lama" },
        { quote: "Whatever the mind can conceive and believe, it can achieve.", author: "Napoleon Hill" },
        { quote: "Demand much from yourself and expect little from others.", author: "Confucius" },
        { quote: "Act as if it were impossible to fail.", author: "Winston Churchill" },
        { quote: "The best way to predict the future is to create it.", author: "Peter Drucker" },
        { quote: "Nothing great in the world has ever been accomplished without passion.", author: "Hegel" },
        { quote: "Make your life a dream, and a dream a reality.", author: "Antoine de Saint-Exupéry" },
        { quote: "Every difficulty met should be one more opportunity to progress.", author: "Pierre de Coubertin" },
        { quote: "The secret of change is to focus all of your energy, not on fighting the old, but on building the new.", author: "Socrates" },
        { quote: "Details make perfection, and perfection is not a detail.", author: "Leonardo da Vinci" },
        { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
        { quote: "Courage is not the absence of fear, but the triumph over it.", author: "Nelson Mandela" },
        { quote: "Perseverance is what makes the impossible possible.", author: "Anonymous" },
        { quote: "Success is not the key to happiness. Happiness is the key to success.", author: "Albert Schweitzer" },
        { quote: "Coming together is a beginning; keeping together is progress; working together is success.", author: "Henry Ford" },
        { quote: "Don't judge each day by the harvest you reap but by the seeds that you plant.", author: "Robert Louis Stevenson" },
        { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { quote: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
        { quote: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
        { quote: "Opportunities don't happen, you create them.", author: "Chris Grosser" },
        { quote: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
        { quote: "Nothing is impossible, the word itself says 'I'm possible'!", author: "Audrey Hepburn" },
        { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" }
    ],
    ar: [
        { quote: "النجاح ليس النهاية، والفشل ليس قاتلاً: إنما الشجاعة للاستمرار هي التي تهم.", author: "وينستون تشرشل" },
        { quote: "الحياة مثل ركوب الدراجة. لتتجنب السقوط، يجب أن تستمر في التحرك.", author: "ألبرت أينشتاين" },
        { quote: "يبدو الأمر دائماً مستحيلاً حتى يكتمل.", author: "نيلسون مانديلا" },
        { quote: "أعظم سر للسعادة هو أن يكون المرء في سلام مع نفسه.", author: "سقراط" },
        { quote: "آمن بنفسك وستصبح لا تقهر.", author: "مجهول" },
        { quote: "النجاح هو الانتقال من فشل إلى فشل دون فقدان الحماس.", author: "وينستون تشرشل" },
        { quote: "طريق الفشل الوحيد هو الاستسلام قبل تحقيق النجاح.", author: "جورج كليمنصو" },
        { quote: "الحدود الوحيدة لتحقيق الغد هي شكوكنا اليوم.", author: "فرانكلين روزفلت" },
        { quote: "السعادة ليست شيئاً جاهزاً، إنها تأتي من أفعالك الخاصة.", author: "دالاي لاما" },
        { quote: "كل ما يمكن لعقل الإنسان تصوره والإيمان به، يمكنه تحقيقه.", author: "نابليون هيل" },
        { quote: "اطلب الكثير من نفسك وتوقع القليل من الآخرين.", author: "كونفوشيوس" },
        { quote: "تصرف وكأن الفشل مستحيل.", author: "وينستون تشرشل" },
        { quote: "أفضل طريقة للتنبؤ بالمستقبل هي أن تصنعه بنفسك.", author: "بيتر دراكر" },
        { quote: "لا شيء عظيم في العالم قد تم تحقيقه بدون شغف.", author: "هيغل" },
        { quote: "اجعل حياتك حلماً، واجعل الحلم حقيقة.", author: "أنطوان دي سانت إكزوبيري" },
        { quote: "كل صعوبة تواجهها يجب أن تكون فرصة جديدة للتقدم والارتقاء.", author: "بيير دي كوبرتان" },
        { quote: "سر التغيير يكمن في تركيز طاقتك كاملة ليس في محاربة القديم بل في بناء الجديد.", author: "سقراط" },
        { quote: "التفاصيل تصنع الكمال، والكمال ليس تفصيلاً بسيطاً.", author: "ليوناردو دا فينشي" },
        { quote: "عش كأنك ستموت غداً. وتعلم كأنك ستعيش للأبد.", author: "غاندي" },
        { quote: "ليست الشجاعة في غياب الخوف، بل في التغلب عليه.", author: "نيلسون مانديلا" },
        { quote: "المثابرة هي ما يجعل المستحيل ممكناً.", author: "مجهول" },
        { quote: "النجاح ليس مفتاح السعادة. بل السعادة هي مفتاح النجاح.", author: "ألبرت شوايتزر" },
        { quote: "الاجتماع معاً هو البداية؛ والبقاء معاً هو التقدم؛ والعمل معاً هو النجاح.", author: "هنري فورد" },
        { quote: "لا تحكم على يومك بحصادك اليومي، بل بالبذور التي زرعتها فيه.", author: "روبرت لويس ستيفنسون" },
        { quote: "السبيل الوحيد للقيام بعمل رائع هو أن تحب ما تفعله.", author: "ستيف جوبز" },
        { quote: "البساطة هي قمة التطور والرقّي.", author: "ليوناردو دا فينشي" },
        { quote: "ابدأ من حيث أنت. استخدم ما تملك. افعل ما تستطيع.", author: "أرثر آش" },
        { quote: "الفرص لا تحدث بالصدفة، بل أنت من يصنعها.", author: "كريس غروسر" },
        { quote: "الدافع هو ما يجعلك تبدأ. والعادة هي ما يجعلك تستمر.", author: "جيم ريون" },
        { quote: "لا شيء مستحيل، الكلمة نفسها تقول 'أنا ممكن'!", author: "أودري هيبورن" },
        { quote: "التعليم هو أقوى سلاح يمكنك استخدامه لتغيير العالم.", author: "نيلسون مانديلا" }
    ]
};
