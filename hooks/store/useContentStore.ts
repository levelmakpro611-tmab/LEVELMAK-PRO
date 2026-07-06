import React, { useState, useEffect, useCallback } from 'react';
import { Quiz, Story, Book, Flashcard, FlashcardDeck, User } from '../../types';
import { triggerPremiumAlert } from '../../utils/premiumAlert';

export const useContentStore = (
    language: 'fr' | 'en' | 'ar' = 'fr',
    user?: User | null,
    setUser?: React.Dispatch<React.SetStateAction<User | null>>
) => {
    const userId = user?.id;
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [stories, setStories] = useState<Story[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [decks, setDecks] = useState<FlashcardDeck[]>([]);

    // Helper to get translated default quizzes
    const getDefaultQuizzes = useCallback((): Quiz[] => {
      if (language === 'en') {
        return [
          {
            id: "quiz_default_egypt",
            title: "History: Ancient Egypt",
            subject: "History",
            summary: "Discover the fascinating secrets of pharaohs, monumental pyramids, and queens of Egypt.",
            keyPoints: [
              "The outstanding reigns of pharaohs like Ramesses II.",
              "The secrets of construction of the monumental Pyramids of Giza.",
              "The role of famous queens like Cleopatra VII."
            ],
            definitions: [
              { term: "Pharaoh", definition: "Absolute ruler of ancient Egypt, considered a divine intermediary." },
              { term: "Hieroglyph", definition: "Figurative writing system used by the ancient Egyptians." }
            ],
            questions: [
              { id: "q_eg1", text: "Which famous pharaoh ruled for nearly 67 years and built the temple of Abu Simbel?", options: ["Ramesses II", "Tutankhamun", "Khufu", "Akhenaten"], correctAnswer: 0, explanation: "Ramesses II had one of the longest and most prosperous reigns in Egyptian history." },
              { id: "q_eg2", text: "Which iconic queen of the Ptolemaic dynasty was the last active ruler of Ancient Egypt?", options: ["Cleopatra VII", "Nefertiti", "Hatshepsut", "Nefertari"], correctAnswer: 0, explanation: "Cleopatra VII is famous for her intellect, reign, and political alliances." },
              { id: "q_eg3", text: "Which pharaoh is world-famous for the discovery of his intact tomb in 1922?", options: ["Tutankhamun", "Ramesses III", "Amenhotep III", "Seti I"], correctAnswer: 0, explanation: "The tomb of Tutankhamun was discovered almost intact by archaeologist Howard Carter." },
              { id: "q_eg4", text: "Which gigantic funerary structure is one of the Seven Wonders of the Ancient World?", options: ["The Great Pyramid of Giza", "The Sphinx of Giza", "The Luxor Temple", "The Lighthouse of Alexandria"], correctAnswer: 0, explanation: "The Great Pyramid of Giza (Khufu) is the only one of the seven wonders of the ancient world still standing today." }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: "quiz_default_math",
            title: "Mathematics & Economy of Guinea",
            subject: "Mathematics",
            summary: "An intensive training quiz combining practical calculations and key concepts of Guinea's economy and geometry.",
            keyPoints: [
              "Calculation of monetary conversion rate for the Guinean Franc (GNF).",
              "Concepts of population density relative to the national land area.",
              "Resolution of surveying and applied geometry problems."
            ],
            definitions: [
              { term: "GNF", definition: "Guinean Franc, the official currency of the Republic of Guinea." },
              { term: "Density", definition: "Average number of inhabitants per square kilometer of land area." }
            ],
            questions: [
              { id: "q_m1", text: "If 1 Euro is worth about 9,500 GNF, how much is a purchase of 20 Euros worth in GNF?", options: ["190,000 GNF", "95,000 GNF", "200,000 GNF", "150,000 GNF"], correctAnswer: 0, explanation: "Multiplying 20 by 9,500 gives precisely 190,000 GNF." },
              { id: "q_m2", text: "Guinea covers 245,857 km². For a population of about 14 million people, what is the approximate average density?", options: ["30 inhab/km²", "57 inhab/km²", "90 inhab/km²", "12 inhab/km²"], correctAnswer: 1, explanation: "14,000,000 divided by 245,857 gives approximately 56.9, which rounds to 57 inhabitants per square kilometer." },
              { id: "q_m3", text: "Mount Nimba rises to 1,752 meters. If a hiker has climbed 850 meters, how many meters are left to go?", options: ["902 meters", "802 meters", "950 meters", "1,000 meters"], correctAnswer: 0, explanation: "The difference is simply: 1,752 - 850 = 902 meters left." },
              { id: "q_m4", text: "Guinea has 4 natural regions. What would be the percentage of each region if they were equally distributed?", options: ["25%", "33%", "20%", "50%"], correctAnswer: 0, explanation: "100% divided by 4 gives exactly 25% of theoretical area per region." }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: "quiz_default_hist",
            title: "History of Guinea: Resistance & Independence",
            subject: "History",
            summary: "A thrilling journey through the anti-colonial resistance and the independence of Guinea in 1958.",
            keyPoints: [
              "Guinea's historic role in African independence.",
              "Iconic figures of colonial resistance.",
              "Traditional social and political organization of the nation."
            ],
            definitions: [
              { term: "Sékou Touré", definition: "First president of independent Guinea and architect of the historic 'No' in the 1958 referendum." },
              { term: "Samori Touré", definition: "Emperor of the Wassoulou Empire and leader of the military resistance against colonization." }
            ],
            questions: [
              { id: "q_h1", text: "On which historic date did Guinea proclaim its national independence?", options: ["October 2, 1958", "July 14, 1789", "June 18, 1815", "January 1, 1960"], correctAnswer: 0, explanation: "It was on October 2, 1958, that Guinea officially became sovereign." },
              { id: "q_h2", text: "Which illustrious resistance fighter fiercely fought colonial troops in the 19th century?", options: ["Samori Touré", "Alpha Yaya Diallo", "Sékou Touré", "Dinah Salifou"], correctAnswer: 0, explanation: "Samori Touré was the great emperor of Wassoulou and leader of this struggle." },
              { id: "q_h3", text: "What is the official motto of the Republic of Guinea?", options: ["Work, Justice, Solidarity", "Liberty, Equality, Fraternity", "Unity, Progress, Justice", "Peace, Work, Fatherland"], correctAnswer: 0, explanation: "The official motto of Guinea is: Work, Justice, Solidarity." },
              { id: "q_h4", text: "Which king of Labé marked the history of colonial resistance in Middle Guinea?", options: ["Alpha Yaya Diallo", "Samori Touré", "Dinah Salifou", "Sékou Touré"], correctAnswer: 0, explanation: "Alpha Yaya Diallo is the famous Guinean king who resisted French colonization." }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: "quiz_default_sci",
            title: "Geography of Guinea: The Four Regions",
            subject: "Geography",
            summary: "A captivating quiz about the unique climate, relief, resources, and geographical regions of Guinea.",
            keyPoints: [
              "The four Guinean natural regions.",
              "Fouta Djallon and the water tower of West Africa.",
              "Mineral resources and major rivers rising in Guinea."
            ],
            definitions: [
              { term: "Fouta Djallon", definition: "Mountainous massif of Middle Guinea from which the largest rivers of the sub-region flow." },
              { term: "Bauxite", definition: "The main ore used to make aluminum, of which Guinea holds the largest reserves in the world." }
            ],
            questions: [
              { id: "q_s1", text: "Into how many natural regions is Guinea traditionally subdivided?", options: ["4 regions", "3 regions", "5 regions", "6 regions"], correctAnswer: 0, explanation: "Guinea comprises 4 regions: Lower Guinea, Middle Guinea, Upper Guinea, and Forest Guinea." },
              { id: "q_s2", text: "What is the national capital of Guinea?", options: ["Conakry", "Kankan", "Labé", "Nzérékoré"], correctAnswer: 0, explanation: "Conakry is the political and administrative capital of the country." },
              { id: "q_s3", text: "Which major West African river rises in the Fouta Djallon?", options: ["The Niger", "The Senegal", "The Congo", "The Nile"], correctAnswer: 0, explanation: "The Niger River rises in the Guinean heights." },
              { id: "q_s4", text: "Which essential mineral resource makes Guinea an extremely mineral-rich country?", options: ["Bauxite", "Oil", "Natural gas", "Coal"], correctAnswer: 0, explanation: "Guinea holds the largest global deposits of bauxite." }
            ],
            createdAt: new Date().toISOString()
          }
        ];
      } else if (language === 'ar') {
        return [
          {
            id: "quiz_default_egypt",
            title: "التاريخ: مصر القديمة",
            subject: "التاريخ",
            summary: "اكتشف الأسرار الرائعة للفراعنة، والأهرامات الضخمة، وملكات مصر.",
            keyPoints: [
              "العهود البارزة للفراعنة مثل رمسيس الثاني.",
              "أسرار بناء أهرامات الجيزة الأثرية.",
              "دور الملكات الشهيرات مثل كليوبترا السابعة."
            ],
            definitions: [
              { term: "فرعون", definition: "الحاكم المطلق لمصر القديمة، ويُعتبر وسيطاً إلهياً." },
              { term: "هيروغليفية", definition: "نظام كتابة تصويرية استخدمه المصريون القدماء." }
            ],
            questions: [
              { id: "q_eg1", text: "أي فرعون شهير حكم لما يقرب من 67 عاماً وبنى معبد أبو سمبل؟", options: ["رمسيس الثاني", "توت عنخ آمون", "خوفو", "إخناتون"], correctAnswer: 0, explanation: "كان عهد رمسيس الثاني أحد أطول العهود وأكثرها ازدهاراً في التاريخ المصري." },
              { id: "q_eg2", text: "من هي الملكة الشهيرة من السلالة البطلمية التي كانت آخر حكام مصر القديمة؟", options: ["كليوبترا السابعة", "نفرتيتي", "حاتشبسوت", "نفرتاري"], correctAnswer: 0, explanation: "تشتهر كليوبترا السابعة بذكائها وحكمها وتحالفاتها السياسية." },
              { id: "q_eg3", text: "من هو الفرعون المشهور عالمياً باكتشاف مقبرته سليمة عام 1922؟", options: ["توت عنخ آمون", "رمسيس الثالث", "أمنحتب الثالث", "سيتي الأول"], correctAnswer: 0, explanation: "اكتشف عالم الآثار هوارد كارتر مقبرة توت عنخ آمون سليمة تماماً تقريباً." },
              { id: "q_eg4", text: "أي صرح جنائزي ضخم يعد من عجائب الدنيا السبع في العالم القديم؟", options: ["الهرم الأكبر لخوفو", "أبو الهول بالجيزة", "معبد الأقصر", "منارة الإسكندرية"], correctAnswer: 0, explanation: "هرم خوفو الأكبر هو العجيبة الوحيدة المتبقية من عجائب الدنيا السبع القديمة حتى اليوم." }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: "quiz_default_math",
            title: "الرياضيات والاقتصاد في غينيا",
            subject: "الرياضيات",
            summary: "مسابقة تدريبية مكثفة تجمع بين الحسابات العملية والمفاهيم الأساسية لاقتصاد وهندسة غينيا.",
            keyPoints: [
              "حساب سعر تحويل العملة للفرنك الغيني (GNF).",
              "مفاهيم الكثافة السكانية بالنسبة لمساحة البلاد.",
              "حل مسائل مساحة الأراضي والهندسة التطبيقية."
            ],
            definitions: [
              { term: "GNF", definition: "الفرنك الغيني، العملة الرسمية لجمهورية غينيا." },
              { term: "الكثافة", definition: "متوسط عدد السكان في الكيلومتر المربع الواحد من المساحة الأرضية." }
            ],
            questions: [
              { id: "q_m1", text: "إذا كان اليورو الواحد يعادل حوالي 9500 فرنك غيني، فما هي قيمة شراء بقيمة 20 يورو بالفرنك الغيني؟", options: ["190,000 فرنك غيني", "95,000 فرنك غيني", "200,000 فرنك غيني", "150,000 فرنك غيني"], correctAnswer: 0, explanation: "ضرب 20 في 9500 يعطي بالضبط 190,000 فرنك غيني." },
              { id: "q_m2", text: "تبلغ مساحة غينيا 245,857 كم². بالنسبة لعدد سكان يبلغ حوالي 14 مليون نسمة، ما هي الكثافة السكانية المتوسطة التقريبية؟", options: ["30 نسمة/كم²", "57 نسمة/كم²", "90 نسمة/كم²", "12 نسمة/كم²"], correctAnswer: 1, explanation: "قسمة 14,000,000 على 245,857 تعطي حوالي 56.9، أي ما يقارب 57 نسمة لكل كيلومتر مربع." },
              { id: "q_m3", text: "يرتفع جبل نيمبا إلى 1752 متراً. إذا تسلق أحد المتجولين 850 متراً، فكم متراً يتبقى له للوصول؟", options: ["902 متراً", "802 متراً", "950 متراً", "1000 متراً"], correctAnswer: 0, explanation: "الفرق البسيط هو: 1752 - 850 = 902 متراً متبقية." },
              { id: "q_m4", text: "تضم غينيا 4 مناطق طبيعية. ما هي النسبة المئوية لكل منطقة إذا تم تقسيمها بالتساوي؟", options: ["25%", "33%", "20%", "50%"], correctAnswer: 0, explanation: "100% مقسومة على 4 تعطي بالضبط 25% من المساحة النظرية لكل منطقة." }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: "quiz_default_hist",
            title: "تاريخ غينيا: المقاومة والاستقلال",
            subject: "التاريخ",
            summary: "رحلة مثيرة عبر تاريخ المقاومة ضد الاستعمار واستقلال غينيا عام 1958.",
            keyPoints: [
              "دور غينيا التاريخي في استقلال إفريقيا.",
              "شخصيات بارزة في المقاومة ضد الاستعمار.",
              "التنظيم الاجتماعي والسياسي التقليدي للأمة."
            ],
            definitions: [
              { term: "سيكو توري", definition: "أول رئيس لغينيا المستقلة ومهندس الـ 'لا' التاريخية في استفتاء عام 1958." },
              { term: "ساموري توري", definition: "إمبراطور إمبراطورية واسولو وقائد المقاومة العسكرية ضد الاستعمار." }
            ],
            questions: [
              { id: "q_h1", text: "في أي تاريخ تاريخي أعلنت غينيا استقلالها الوطني؟", options: ["2 أكتوبر 1958", "14 يوليو 1789", "18 يونيو 1815", "1 يناير 1960"], correctAnswer: 0, explanation: "في 2 أكتوبر 1958 أصبحت غينيا دولة ذات سيادة رسمياً." },
              { id: "q_h2", text: "أي مقاوم بارز حارب بشراسة القوات الاستعمارية في القرن التاسع عشر؟", options: ["ساموري توري", "ألفا يايا ديالو", "سيكو توري", "ديناه ساليفو"], correctAnswer: 0, explanation: "كان ساموري توري الإمبراطور العظيم لواصولو وقائد هذا الكفاح." },
              { id: "q_h3", text: "ما هو الشعار الرسمي لجمهورية غينيا؟", options: ["عمل، عدالة، تضامن", "حرية، مساواة، أخوة", "وحدة، تقدم، عدالة", "سلام، عمل، وطن"], correctAnswer: 0, explanation: "الشعار الرسمي لغينيا هو: عمل، عدالة، تضامن." },
              { id: "q_h4", text: "أي ملك لمقاطعة لابي ترك بصمة في تاريخ المقاومة الاستعمارية في غينيا الوسطى?", options: ["ألفا يايا ديالو", "ساموري توري", "ديناه ساليفو", "سيكو توري"], correctAnswer: 0, explanation: "ألفا يايا ديالو هو الملك الغيني الشهير الذي قاوم الاستعمار الفرنسي." }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: "quiz_default_sci",
            title: "جغرافيا غينيا: المناطق الأربع",
            subject: "الجغرافيا",
            summary: "مسابقة شيقة عن المناخ والتضاريس والموارد والمناطق الجغرافية الفريدة في غينيا.",
            keyPoints: [
              "المناطق الطبيعية الأربع في غينيا.",
              "فوتا جالون وخزان مياه غرب إفريقيا.",
              "الموارد المعدنية والأنهار الرئيسية التي تنبع من غينيا."
            ],
            definitions: [
              { term: "فوتا جالون", definition: "كتلة جبلية في غينيا الوسطى تنبع منها أكبر أنهار المنطقة." },
              { term: "بوكسيت", definition: "الخام الرئيسي المستخدم في صناعة الألمنيوم، وتمتلك غينيا أكبر احتياطيات منه في العالم." }
            ],
            questions: [
              { id: "q_s1", text: "إلى كم منطقة طبيعية تنقسم غينيا تقليدياً؟", options: ["4 مناطق", "3 مناطق", "5 مناطق", "6 مناطق"], correctAnswer: 0, explanation: "تضم غينيا 4 مناطق: غينيا البحرية، غينيا الوسطى، غينيا العليا، وغينيا الغابية." },
              { id: "q_s2", text: "ما هي العاصمة الوطنية لغينيا؟", options: ["كوناكري", "كانكان", "لابي", "نزيريكوري"], correctAnswer: 0, explanation: "كوناكري هي العاصمة السياسية والإدارية للبلاد." },
              { id: "q_s3", text: "أي نهر رئيسي في غرب إفريقيا ينبع من فوتا جالون؟", options: ["النيجر", "السنغال", "الكونغو", "النيل"], correctAnswer: 0, explanation: "ينبع نهر النيجر من المرتفعات الغينية." },
              { id: "q_s4", text: "ما هي الثروة المعدنية الأساسية التي تجعل غينيا بلداً غنياً جداً بالمعادن؟", options: ["البوكسيت", "النفط", "الغاز الطبيعي", "الفحم"], correctAnswer: 0, explanation: "تمتلك غينيا أكبر احتياطيات البوكسيت في العالم." }
            ],
            createdAt: new Date().toISOString()
          }
        ];
      }
      
      // Default: French
      return [
        {
          id: "quiz_default_egypt",
          title: "Histoire : L'Égypte Antique",
          subject: "Histoire",
          summary: "Découvrez les secrets fascinants des pharaons, des pyramides monumentales et des reines d'Égypte.",
          keyPoints: [
            "Les règnes marquants des pharaons comme Ramsès II.",
            "Les secrets de construction des pyramides monumentales de Gizeh.",
            "Le rôle des reines célèbres comme Cléopâtre VII."
          ],
          definitions: [
            { term: "Pharaon", definition: "Souverain absolu de l'Égypte antique, considéré comme un intermédiaire divin." },
            { term: "Hiéroglyphe", definition: "Système d'écriture figurative utilisé par les anciens Égyptiens." }
          ],
          questions: [
            { id: "q_eg1", text: "Quel pharaon célèbre a régné pendant près de 67 ans et fait bâtir le temple d'Abou Simbel ?", options: ["Ramsès II", "Toutânkhamon", "Khéops", "Akhenaton"], correctAnswer: 0, explanation: "Ramsès II a eu l'un des règnes les plus longs et les plus prospères de l'histoire égyptienne." },
            { id: "q_eg2", text: "Quelle reine emblématique de la dynastie des Ptolémées fut la dernière souveraine de l'Égypte antique ?", options: ["Cléopâtre VII", "Néfertiti", "Hatchepsout", "Néfertari"], correctAnswer: 0, explanation: "Cléopâtre VII est célèbre pour son intelligence, son règne et ses alliances politiques." },
            { id: "q_eg3", text: "Quel pharaon est mondialement célèbre pour la découverte de son tombeau intact en 1922 ?", options: ["Toutânkhamon", "Ramsès III", "Aménophis III", "Séthi Ier"], correctAnswer: 0, explanation: "La tombe de Toutânkhamon a été découverte presque intacte par l'archéologue Howard Carter." },
            { id: "q_eg4", text: "Quelle gigantesque construction funéraire fait partie des Sept Merveilles du monde antique ?", options: ["La Grande Pyramide de Khéops", "Le Sphinx de Gizeh", "Le Temple de Louxor", "Le Phare d'Alexandrie"], correctAnswer: 0, explanation: "La pyramide de Khéops est la seule des sept merveilles du monde antique encore debout aujourd'hui." }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: "quiz_default_math",
          title: "Mathématiques & Économie de la Guinée",
          subject: "Mathématiques",
          summary: "Un quiz d'entraînement intensif combinant calculs pratiques et notions clés de l'économie et de la géométrie de la Guinée.",
          keyPoints: [
            "Calcul de taux de conversion monétaire du Franc Guinéen (GNF).",
            "Notions de densité de population par rapport à la superficie nationale.",
            "Résolution de problèmes d'arpentage et de géométrie appliquée."
          ],
          definitions: [
            { term: "GNF", definition: "Franc Guinéen, la devise monétaire officielle de la République de Guinée." },
            { term: "Densité", definition: "Nombre d'habitants moyen par kilomètre carré de superficie terrestre." }
          ],
          questions: [
            { id: "q_m1", text: "Si 1 Euro vaut environ 9 500 GNF, combien vaut un achat de 20 Euros converti en GNF ?", options: ["190 000 GNF", "95 000 GNF", "200 000 GNF", "150 000 GNF"], correctAnswer: 0, explanation: "En multipliant 20 par 9 500, on obtient précisément 190 000 GNF." },
            { id: "q_m2", text: "La Guinée s'étend sur 245 857 km². Pour une population d'environ 14 millions d'habitants, quelle est la densité moyenne approchée ?", options: ["30 hab/km²", "57 hab/km²", "90 hab/km²", "12 hab/km²"], correctAnswer: 1, explanation: "14 000 000 divisé par 245 857 donne environ 56,9 soit 57 habitants par kilomètre carré." },
            { id: "q_m3", text: "Le mont Nimba s'élève à 1 752 mètres. Si un randonneur a gravi 850 mètres, combien de mètres lui reste-t-il à parcourir ?", options: ["902 mètres", "802 mètres", "950 mètres", "1 000 mètres"], correctAnswer: 0, explanation: "La différence simple est : 1752 - 850 = 902 mètres restants." },
            { id: "q_m4", text: "La Guinée compte 4 régions naturelles. Quel est le pourcentage de chaque région si elles étaient équitablement réparties ?", options: ["25%", "33%", "20%", "50%"], correctAnswer: 0, explanation: "100% divisé par 4 donne exactement 25% de superficie théorique par région." }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: "quiz_default_hist",
          title: "Histoire de la Guinée : Résistance & Indépendance",
          subject: "Histoire",
          summary: "Un voyage passionnant à travers la résistance anticoloniale et l'indépendance de la Guinée en 1958.",
          keyPoints: [
            "Le rôle historique de la Guinée dans l'indépendance africaine.",
            "Les figures emblématiques de la résistance coloniale.",
            "L'organisation sociale et politique traditionnelle de la nation."
          ],
          definitions: [
            { term: "Sékou Touré", definition: "Premier président de la Guinée indépendante et artisan du non historique au référendum de 1958." },
            { term: "Samory Touré", definition: "Empereur de l'Empire de Wassoulou et chef de la résistance militaire contre la colonisation." }
          ],
          questions: [
            { id: "q_h1", text: "À quelle date historique la Guinée a-t-elle proclamé son indépendance nationale ?", options: ["2 octobre 1958", "14 juillet 1789", "18 juin 1815", "1 janvier 1960"], correctAnswer: 0, explanation: "C'est le 2 octobre 1958 que la Guinée est devenue officiellement souveraine." },
            { id: "q_h2", text: "Quel illustre résistant a farouchement combattu les troupes coloniales au XIXe siècle ?", options: ["Samory Touré", "Alpha Yaya Diallo", "Sékou Touré", "Dinah Salifou"], correctAnswer: 0, explanation: "Samory Touré fut le grand empereur de Wassoulou et leader de cette lutte." },
            { id: "q_h3", text: "Quelle est la devise officielle de la République de Guinée ?", options: ["Travail, Justice, Solidarité", "Liberté, Égalité, Fraternité", "Unité, Progrès, Justice", "Paix, Travail, Patrie"], correctAnswer: 0, explanation: "La devise officielle de la Guinée est : Travail, Justice, Solidarité." },
            { id: "q_h4", text: "Quel roi du Labé a marqué l'histoire de la résistance coloniale en Moyenne-Guinée ?", options: ["Alpha Yaya Diallo", "Samory Touré", "Dinah Salifou", "Sékou Touré"], correctAnswer: 0, explanation: "Alpha Yaya Diallo est le célèbre roi guinéen qui a résisté à la colonisation française." }
          ],
          createdAt: new Date().toISOString()
        },
        {
          id: "quiz_default_sci",
          title: "Géographie de la Guinée : Les Quatre Régions",
          subject: "Géographie",
          summary: "Un quiz captivant sur le climat, le relief, les ressources et les régions géographiques uniques de la Guinée.",
          keyPoints: [
            "Les quatre régions naturelles guinéennes.",
            "Le Fouta-Djalon et le chateau d'eau d'Afrique de l'Ouest.",
            "Les ressources minières et fleuves majeurs prenant source en Guinée."
          ],
          definitions: [
            { term: "Fouta-Djalon", definition: "Massif montagneux de la Moyenne-Guinée d'où partent les plus grands fleuves de la sous-région." },
            { term: "Bauxite", definition: "Minerai principal servant à fabriquer l'aluminium, dont la Guinée possède les plus grandes réserves mondiales." }
          ],
          questions: [
            { id: "q_s1", text: "En combien de régions naturelles la Guinée est-elle traditionnellement subdivisée ?", options: ["4 régions", "3 régions", "5 régions", "6 régions"], correctAnswer: 0, explanation: "La Guinée comprend 4 régions : la Basse-Guinée, la Moyenne-Guinée, la Haute-Guinée et la Guinée Forestière." },
            { id: "q_s2", text: "La capitale nationale de la Guinée ?", options: ["Conakry", "Kankan", "Labé", "Nzérékoré"], correctAnswer: 0, explanation: "Conakry est la capitale politique et administrative du pays." },
            { id: "q_s3", text: "Quel fleuve majeur d'Afrique de l'Ouest prend sa source au Fouta-Djalon ?", options: ["Le Niger", "Le Sénégal", "Le Congo", "Le Nil"], correctAnswer: 0, explanation: "Le fleuve Niger prend sa source dans les hauteurs guinéennes." },
            { id: "q_s4", text: "Quelle ressource minière essentielle fait de la Guinée un pays extrêmement riche en minerais ?", options: ["La bauxite", "Le pétrole", "Le gaz naturel", "Le charbon"], correctAnswer: 0, explanation: "La Guinée possède les plus grands gisements mondiaux de bauxite." }
          ],
          createdAt: new Date().toISOString()
        }
      ];
    }, [language]);

    // Helper to get translated default decks
    const getDefaultDecks = useCallback((): FlashcardDeck[] => {
      if (language === 'en') {
        return [
          {
            id: "deck_default_colonisation",
            title: "History: Colonization in Africa",
            subject: "History",
            cardCount: 3,
            createdAt: new Date().toISOString()
          },
          {
            id: "deck_default_guinee",
            title: "Geography & History: Lesson on Guinea",
            subject: "Geography",
            cardCount: 3,
            createdAt: new Date().toISOString()
          },
          {
            id: "deck_default_afrique",
            title: "General Knowledge: Lesson on Africa",
            subject: "General Knowledge",
            cardCount: 3,
            createdAt: new Date().toISOString()
          }
        ];
      } else if (language === 'ar') {
        return [
          {
            id: "deck_default_colonisation",
            title: "التاريخ: الاستعمار في إفريقيا",
            subject: "التاريخ",
            cardCount: 3,
            createdAt: new Date().toISOString()
          },
          {
            id: "deck_default_guinee",
            title: "الجغرافيا والتاريخ: درس عن غينيا",
            subject: "الجغرافيا",
            cardCount: 3,
            createdAt: new Date().toISOString()
          },
          {
            id: "deck_default_afrique",
            title: "الثقافة العامة: درس عن إفريقيا",
            subject: "الثقافة العامة",
            cardCount: 3,
            createdAt: new Date().toISOString()
          }
        ];
      }

      // Default: French
      return [
        {
          id: "deck_default_colonisation",
          title: "Histoire : La Colonisation en Afrique",
          subject: "Histoire",
          cardCount: 3,
          createdAt: new Date().toISOString()
        },
        {
          id: "deck_default_guinee",
          title: "Géographie & Histoire : Leçon sur la Guinée",
          subject: "Géographie",
          cardCount: 3,
          createdAt: new Date().toISOString()
        },
        {
          id: "deck_default_afrique",
          title: "Culture Générale : Leçon sur l'Afrique",
          subject: "Culture Générale",
          cardCount: 3,
          createdAt: new Date().toISOString()
        }
      ];
    }, [language]);

    // Helper to get translated default flashcards
    const getDefaultFlashcards = useCallback((): Flashcard[] => {
      if (language === 'en') {
        return [
          // Deck 1: Colonisation
          {
            id: "fc_c1",
            front: "What was the Berlin Conference (1884-1885)?",
            back: "It was the historic meeting of European powers to plan the colonial partition and systematic occupation of the African continent.",
            deckId: "deck_default_colonisation",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_c2",
            front: "What was the role of political resistance in colonial Africa?",
            back: "Organizing boycotts, demonstrations, strikes, and structuring the first political parties to demand national independence.",
            deckId: "deck_default_colonisation",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_c3",
            front: "How did colonization manifest economically?",
            back: "By the massive extraction of African raw materials (gold, rubber, minerals) and the imposition of mandatory export crops.",
            deckId: "deck_default_colonisation",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          // Deck 2: Guinée
          {
            id: "fc_g1",
            front: "What is the date of Guinea's independence?",
            back: "October 2, 1958, making Guinea the first sub-Saharan French colony to proclaim its sovereignty.",
            deckId: "deck_default_guinee",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_g2",
            front: "What was the impact of Guinea's historic 'No' in 1958?",
            back: "Led by Sékou Touré, Guinea rejected de Gaulle's Community to choose immediate and total independence.",
            deckId: "deck_default_guinee",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_g3",
            front: "What are the 4 natural regions of Guinea?",
            back: "Lower Guinea (Maritime), Middle Guinea (Fouta Djallon), Upper Guinea (Savanna), and Forest Guinea (Massifs and Forests).",
            deckId: "deck_default_guinee",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          // Deck 3: Afrique
          {
            id: "fc_a1",
            front: "Why is Africa called the cradle of humanity?",
            back: "Because the oldest hominid fossils, direct ancestors of modern humans, were discovered on the African continent.",
            deckId: "deck_default_afrique",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_a2",
            front: "What is the African Union (AU)?",
            back: "The organization representing all 55 African nations, founded to strengthen political and economic unity and peace on the continent.",
            deckId: "deck_default_afrique",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_a3",
            front: "What is the longest river in Africa?",
            back: "The Nile, stretching over 6,600 kilometers through ten countries in Eastern and Northern Africa.",
            deckId: "deck_default_afrique",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          }
        ];
      } else if (language === 'ar') {
        return [
          // Deck 1: Colonisation
          {
            id: "fc_c1",
            front: "ما هو مؤتمر برلين (1884-1885)؟",
            back: "هو الاجتماع التاريخي للقوى الأوروبية للتخطيط للتقسيم الاستعماري والاحتلال المنهجي للقارة الإفريقية.",
            deckId: "deck_default_colonisation",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_c2",
            front: "ماذا كان دور المقاومة السياسية في إفريقيا الاستعمارية؟",
            back: "تنظيم حملات المقاطعة والمظاهرات والإضرابات وتأسيس أولى الأحزاب السياسية للمطالبة بالاستقلال الوطني.",
            deckId: "deck_default_colonisation",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_c3",
            front: "كيف تجلى الاستعمار على الصعيد الاقتصادي؟",
            back: "من خلال الاستخراج المكثف للمواد الخام الإفريقية (الذهب، المطاط، المعادن) وفرض زراعة محاصيل إلزامية للتصدير.",
            deckId: "deck_default_colonisation",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          // Deck 2: Guinée
          {
            id: "fc_g1",
            front: "ما هو تاريخ استقلال غينيا؟",
            back: "2 أكتوبر 1958، مما جعل غينيا أول مستعمرة فرنسية في إفريقيا جنوب الصحراء تعلن سيادتها.",
            deckId: "deck_default_guinee",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_g2",
            front: "ما هو أثر الـ 'لا' التاريخية لغينيا عام 1958؟",
            back: "بدفع من سيكو توري، رفضت غينيا الانضمام إلى المجموعة الفرنسية التي اقترحها ديغول لتختار الاستقلال الفوري والكامل.",
            deckId: "deck_default_guinee",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_g3",
            front: "ما هي المناطق الطبيعية الأربع لغينيا؟",
            back: "غينيا البحرية (الساحلية)، غينيا الوسطى (فوتا جالون)، غينيا العليا (السافانا)، وغينيا الغابية (المرتفعات والغابات).",
            deckId: "deck_default_guinee",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          // Deck 3: Afrique
          {
            id: "fc_a1",
            front: "لماذا يقال إن إفريقيا هي مهد البشرية؟",
            back: "لأنه تم اكتشاف أقدم الأحافير لأشباه البشر، وهم الأسلاف المباشرون للإنسان الحديث، في القارة الإفريقية.",
            deckId: "deck_default_afrique",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_a2",
            front: "ما هو الاتحاد الإفريقي (UA)؟",
            back: "المنظمة التي تضم جميع دول إفريقيا الـ 55، وتأسست لتعزيز الوحدة السياسية والاقتصادية والسلام في القارة.",
            deckId: "deck_default_afrique",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          },
          {
            id: "fc_a3",
            front: "ما هو أطول نهر في إفريقيا؟",
            back: "نهر النيل، ويمتد لأكثر من 6600 كيلومتر ويمر عبر عشر دول في شرق وشمال إفريقيا.",
            deckId: "deck_default_afrique",
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0
          }
        ];
      }

      // Default: French
      return [
        // Deck 1: Colonisation
        {
          id: "fc_c1",
          front: "Qu'est-ce que la conférence de Berlin (1884-1885) ?",
          back: "C'est la réunion historique des puissances européennes pour planifier le partage colonial et l'occupation systématique du continent africain.",
          deckId: "deck_default_colonisation",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0
        },
        {
          id: "fc_c2",
          front: "Quel a été le rôle de la résistance politique en Afrique coloniale ?",
          back: "Organiser des boycotts, des manifestations, des grèves et structurer les premiers partis politiques pour revendiquer l'indépendance nationale.",
          deckId: "deck_default_colonisation",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0
        },
        {
          id: "fc_c3",
          front: "Comment s'est manifestée la colonisation sur le plan économique ?",
          back: "Par l'extraction massive des matières premières africaines (or, caoutchouc, minerais) et l'imposition de cultures d'exportation obligatoires.",
          deckId: "deck_default_colonisation",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0
        },
        // Deck 2: Guinée
        {
          id: "fc_g1",
          front: "Quelle est la date de l'indépendance de la Guinée ?",
          back: "Le 2 octobre 1958, faisant de la Guinée la première nation colonie française d'Afrique subsaharienne à proclamer sa souveraineté.",
          deckId: "deck_default_guinee",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0
        },
        {
          id: "fc_g2",
          front: "Quel est l'impact du 'Non' historique de la Guinée en 1958 ?",
          back: "Sous l'impulsion de Sékou Touré, la Guinée a rejeté la Communauté de de Gaulle pour choisir l'indépendance immédiate et totale.",
          deckId: "deck_default_guinee",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0
        },
        {
          id: "fc_g3",
          front: "Quelles sont les 4 régions naturelles de la Guinée ?",
          back: "La Basse-Guinée (Maritime), la Moyenne-Guinée (Fouta-Djalon), la Haute-Guinée (Savane) et la Guinée Forestière (Massifs et Forêts).",
          deckId: "deck_default_guinee",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0
        },
        // Deck 3: Afrique
        {
          id: "fc_a1",
          front: "Pourquoi dit-on que l'Afrique est le berceau de l'humanité ?",
          back: "Car c'est sur le continent africain qu'ont été mis au jour les plus anciens fossiles d'hominidés ancêtres directs de l'Homme moderne.",
          deckId: "deck_default_afrique",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0
        },
        {
          id: "fc_a2",
          front: "Qu'est-ce que l'Union Africaine (UA) ?",
          back: "L'organisation regroupant l'intégralité des 55 États d'Afrique, fondée pour renforcer l'unité politique, économique et la paix sur le continent.",
          deckId: "deck_default_afrique",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0
        },
        {
          id: "fc_a3",
          front: "Quel est le plus grand fleuve d'Afrique ?",
          back: "Le Nil, s'étirant sur plus de 6 600 kilomètres à travers dix pays d'Afrique de l'Est et du Nord.",
          deckId: "deck_default_afrique",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0
        }
      ];
    }, [language]);

    // Load and intelligently merge content from LocalStorage on mount, language changes, and userId changes
    useEffect(() => {
        const quizKey = userId ? `levelmak_${userId}_quizzes` : 'levelmak_quizzes';
        const deckKey = userId ? `levelmak_${userId}_decks` : 'levelmak_decks';
        const fcKey = userId ? `levelmak_${userId}_flashcards` : 'levelmak_flashcards';
        const storiesKey = userId ? `levelmak_${userId}_stories` : 'levelmak_stories';
        const booksKey = userId ? `levelmak_${userId}_books` : 'levelmak_books';

        // Helper to load items
        const load = (key: string, setter: (val: any) => void) => {
            const data = localStorage.getItem(key);
            if (data) {
                try { setter(JSON.parse(data)); } catch (e) { console.error(`Error loading ${key}`, e); }
            } else {
                setter([]);
            }
        };

        // --- 1. QUIZZES MERGING ---
        const defaultQuizzes = getDefaultQuizzes();
        let quizData = localStorage.getItem(quizKey);
        // Cloud recovery: if local storage is empty and cloud has backup, restore it
        if (!quizData && user?.stats?.customQuizzes) {
            quizData = JSON.stringify(user.stats.customQuizzes);
        }
        let currentQuizzes: Quiz[] = [];
        if (quizData) {
            try { currentQuizzes = JSON.parse(quizData); } catch (e) { console.error(e); }
        }
        const customQuizzes = currentQuizzes.filter(q => !defaultQuizzes.some(dq => dq.id === q.id));
        const mergedQuizzes = [...defaultQuizzes, ...customQuizzes];
        setQuizzes(mergedQuizzes);
        localStorage.setItem(quizKey, JSON.stringify(mergedQuizzes));

        // --- 2. DECK MERGING ---
        const defaultDecks = getDefaultDecks();
        let deckData = localStorage.getItem(deckKey);
        // Cloud recovery
        if (!deckData && user?.stats?.customDecks) {
            deckData = JSON.stringify(user.stats.customDecks);
        }
        let currentDecks: FlashcardDeck[] = [];
        if (deckData) {
            try { currentDecks = JSON.parse(deckData); } catch (e) { console.error(e); }
        }
        const customDecks = currentDecks.filter(d => !defaultDecks.some(dd => dd.id === d.id));
        const mergedDecks = [...defaultDecks, ...customDecks];
        setDecks(mergedDecks);
        localStorage.setItem(deckKey, JSON.stringify(mergedDecks));

        // --- 3. FLASHCARDS MERGING ---
        const defaultFlashcards = getDefaultFlashcards();
        let fcData = localStorage.getItem(fcKey);
        // Cloud recovery
        if (!fcData && user?.stats?.customFlashcards) {
            fcData = JSON.stringify(user.stats.customFlashcards);
        }
        let currentFlashcards: Flashcard[] = [];
        if (fcData) {
            try { currentFlashcards = JSON.parse(fcData); } catch (e) { console.error(e); }
        }
        const customFlashcards = currentFlashcards.filter(f => !defaultFlashcards.some(df => df.id === f.id));
        const mergedFlashcards = [...defaultFlashcards, ...customFlashcards];
        setFlashcards(mergedFlashcards);
        localStorage.setItem(fcKey, JSON.stringify(mergedFlashcards));

        // --- 4. STORIES AND BOOKS LOADING ---
        if (!localStorage.getItem(storiesKey) && user?.stats?.customStories) {
            localStorage.setItem(storiesKey, JSON.stringify(user.stats.customStories));
        }
        if (!localStorage.getItem(booksKey) && user?.stats?.customBooks) {
            localStorage.setItem(booksKey, JSON.stringify(user.stats.customBooks));
        }

        load(storiesKey, setStories);
        load(booksKey, setBooks);

        // --- 5. BACKGROUND SYNCHRONIZATION ---
        if (userId && !userId.includes('anon')) {
            import('../../services/syncService').then(({ syncService }) => {
                syncService.syncUserContent(userId).then(({ success }) => {
                    if (success) {
                        // Reload state to present synced content dynamically
                        load(storiesKey, setStories);
                        load(booksKey, setBooks);

                        const freshQuizzes = localStorage.getItem(quizKey);
                        if (freshQuizzes) {
                            try {
                                const parsed = JSON.parse(freshQuizzes);
                                const customOnly = parsed.filter((q: Quiz) => !defaultQuizzes.some(dq => dq.id === q.id));
                                setQuizzes([...defaultQuizzes, ...customOnly]);
                            } catch (e) { console.error(e); }
                        }

                        const freshDecks = localStorage.getItem(deckKey);
                        if (freshDecks) {
                            try {
                                const parsed = JSON.parse(freshDecks);
                                const customOnly = parsed.filter((d: FlashcardDeck) => !defaultDecks.some(dd => dd.id === d.id));
                                setDecks([...defaultDecks, ...customOnly]);
                            } catch (e) { console.error(e); }
                        }

                        const freshCards = localStorage.getItem(fcKey);
                        if (freshCards) {
                            try {
                                const parsed = JSON.parse(freshCards);
                                const customOnly = parsed.filter((c: Flashcard) => !defaultFlashcards.some(df => df.id === c.id));
                                setFlashcards([...defaultFlashcards, ...customOnly]);
                            } catch (e) { console.error(e); }
                        }
                    }
                }).catch(err => console.error('[ContentStore Sync Error]:', err));
            });
        }
    }, [language, user, getDefaultQuizzes, getDefaultDecks, getDefaultFlashcards]);

    const saveQuiz = useCallback((quiz: Quiz) => {
        const isExisting = quizzes.some(q => q.id === quiz.id);
        const defaultQuizzes = getDefaultQuizzes();
        const customQuizzes = quizzes.filter(q => !defaultQuizzes.some(dq => dq.id === q.id));

        const isPremiumActive = !!(user && user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > Date.now());

        if (!isPremiumActive && !isExisting && customQuizzes.length >= 3) {
            const msg = language === 'fr'
                ? "Limite atteinte : Vous ne pouvez créer que 3 quiz personnalisés dans le plan gratuit. Veuillez vous abonner pour en créer un nombre illimité !"
                : language === 'ar'
                ? "تم الوصول إلى الحد الأقصى: يمكنك إنشاء 3 اختبارات مخصصة فقط في الخطة المجانية. يرجى الاشتراك لإنشاء عدد غير محدود!"
                : "Limit reached: You can only create 3 custom quizzes in the free plan. Please subscribe to create unlimited ones!";
            triggerPremiumAlert(
                language === 'fr' ? "Limite Atteinte ⏳" : "Limit Reached ⏳",
                msg,
                language === 'fr' ? "S'abonner" : "Subscribe",
                () => {
                    window.dispatchEvent(new CustomEvent('nav_change', { detail: 'pricing' }));
                }
            );
            return;
        }

        setQuizzes(prev => {
            const updated = [quiz, ...prev.filter(q => q.id !== quiz.id)];
            const quizKey = userId ? `levelmak_${userId}_quizzes` : 'levelmak_quizzes';
            localStorage.setItem(quizKey, JSON.stringify(updated));
            return updated;
        });

        if (userId && !userId.includes('anon')) {
            if (isPremiumActive) {
                import('../../services/contentService').then(({ contentService }) => {
                    contentService.saveQuiz(userId, quiz).catch(e => console.error("Error saving quiz to Supabase:", e));
                });
            } else {
                const msg = language === 'fr' 
                    ? "La sauvegarde sur le cloud est une fonctionnalité Premium. Votre progression est enregistrée localement. Abonnez-vous pour la sauvegarder en ligne !"
                    : language === 'ar'
                    ? "النسخ الاحتياطي السحابي ميزة مدفوعة. تم حفظ تقدمك محلياً. اشترك لحفظه عبر الإنترنت!"
                    : "Cloud backup is a Premium feature. Your progress is saved locally. Subscribe to save it online!";
                triggerPremiumAlert(
                    language === 'fr' ? "Sauvegarde Locale Uniquement 💾" : "Local Backup Only 💾",
                    msg,
                    language === 'fr' ? "Activer le Cloud" : "Activate Cloud Backup",
                    () => {
                        window.dispatchEvent(new CustomEvent('nav_change', { detail: 'pricing' }));
                    }
                );
            }
        }
    }, [userId, user?.is_premium, user?.premium_until, language, quizzes, getDefaultQuizzes]);

    const deleteQuiz = useCallback((id: string) => {
        setQuizzes(prev => {
            const updated = prev.filter(q => q.id !== id);
            const quizKey = userId ? `levelmak_${userId}_quizzes` : 'levelmak_quizzes';
            localStorage.setItem(quizKey, JSON.stringify(updated));
            return updated;
        });

        if (userId && !userId.includes('anon')) {
            import('../../services/contentService').then(({ contentService }) => {
                contentService.deleteQuiz(id).catch(e => console.error("Error deleting quiz from Supabase:", e));
            });
        }
    }, [userId]);

    const saveStory = useCallback((story: Story) => {
        setStories(prev => {
            const updated = [story, ...prev.filter(s => s.id !== story.id)];
            const storiesKey = userId ? `levelmak_${userId}_stories` : 'levelmak_stories';
            localStorage.setItem(storiesKey, JSON.stringify(updated));
            return updated;
        });

        if (userId && !userId.includes('anon')) {
            const isPremiumActiveStory = !!(user && user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > Date.now());
            if (isPremiumActiveStory) {
                import('../../services/contentService').then(({ contentService }) => {
                    contentService.saveStory(userId, story).catch(e => console.error("Error saving story to Supabase:", e));
                });
            } else {
                const msg = language === 'fr'
                    ? "La sauvegarde sur le cloud est une fonctionnalité Premium. Votre histoire est enregistrée localement. Abonnez-vous pour la sauvegarder en ligne !"
                    : language === 'ar'
                    ? "النسخ الاحتياطي السحابي ميزة مدفوعة. تم حفظ قصتك محلياً. اشترك لحفظها عبر الإنترنت!"
                    : "Cloud backup is a Premium feature. Your story is saved locally. Subscribe to save it online!";
                triggerPremiumAlert(
                    language === 'fr' ? "Sauvegarde Locale Uniquement 💾" : "Local Backup Only 💾",
                    msg,
                    language === 'fr' ? "Activer le Cloud" : "Activate Cloud Backup",
                    () => {
                        window.dispatchEvent(new CustomEvent('nav_change', { detail: 'pricing' }));
                    }
                );
            }
        }
    }, [userId, user?.is_premium, user?.premium_until, language]);

    const deleteStory = useCallback((id: string) => {
        setStories(prev => {
            const updated = prev.filter(s => s.id !== id);
            const storiesKey = userId ? `levelmak_${userId}_stories` : 'levelmak_stories';
            localStorage.setItem(storiesKey, JSON.stringify(updated));
            return updated;
        });

        if (userId && !userId.includes('anon')) {
            import('../../services/contentService').then(({ contentService }) => {
                contentService.deleteStory(id).catch(e => console.error("Error deleting story from Supabase:", e));
            });
        }
    }, [userId]);

    const saveBook = useCallback((book: Book) => {
        setBooks(prev => {
            if (prev.some(b => b.title === book.title)) {
                return prev;
            }
            const updated = [book, ...prev];
            const booksKey = userId ? `levelmak_${userId}_books` : 'levelmak_books';
            localStorage.setItem(booksKey, JSON.stringify(updated));
            return updated;
        });
    }, [userId]);

    const deleteBook = useCallback((id: string) => {
        setBooks(prev => {
            const updated = prev.filter(b => b.id !== id);
            const booksKey = userId ? `levelmak_${userId}_books` : 'levelmak_books';
            localStorage.setItem(booksKey, JSON.stringify(updated));
            return updated;
        });
    }, [userId]);

    const saveFlashcardDeck = useCallback((deck: FlashcardDeck, cards: Flashcard[]) => {
        const isExisting = decks.some(d => d.id === deck.id);
        const defaultDecks = getDefaultDecks();
        const customDecks = decks.filter(d => !defaultDecks.some(dd => dd.id === d.id));

        const isPremiumActiveDeck = !!(user && user.is_premium && user.premium_until && new Date(user.premium_until).getTime() > Date.now());

        if (!isPremiumActiveDeck && !isExisting && customDecks.length >= 3) {
            const msg = language === 'fr'
                ? "Limite atteinte : Vous ne pouvez créer que 3 paquets de flashcards personnalisés dans le plan gratuit. Veuillez vous abonner pour en créer un nombre illimité !"
                : language === 'ar'
                ? "تم الوصول إلى الحد الأقصى: يمكنك إنشاء 3 مجموعات بطاقات تعليمية مخصصة فقط في الخطة المجانية. يرجى الاشتراك لإنشاء عدد غير محدود!"
                : "Limit reached: You can only create 3 custom flashcard decks in the free plan. Please subscribe to create unlimited ones!";
            triggerPremiumAlert(
                language === 'fr' ? "Limite de Cartes Atteinte ⏳" : "Deck Limit Reached ⏳",
                msg,
                language === 'fr' ? "S'abonner" : "Subscribe",
                () => {
                    window.dispatchEvent(new CustomEvent('nav_change', { detail: 'pricing' }));
                }
            );
            return;
        }

        setDecks(prev => {
            const updated = [deck, ...prev.filter(d => d.id !== deck.id)];
            const deckKey = userId ? `levelmak_${userId}_decks` : 'levelmak_decks';
            localStorage.setItem(deckKey, JSON.stringify(updated));
            return updated;
        });
        setFlashcards(prev => {
            const updated = [...cards, ...prev.filter(c => !cards.find(nc => nc.id === c.id))];
            const fcKey = userId ? `levelmak_${userId}_flashcards` : 'levelmak_flashcards';
            localStorage.setItem(fcKey, JSON.stringify(updated));
            return updated;
        });

        if (userId && !userId.includes('anon')) {
            if (isPremiumActiveDeck) {
                import('../../services/contentService').then(({ contentService }) => {
                    contentService.saveFlashcardDeck(userId, deck, cards).catch(e => console.error("Error saving deck/cards to Supabase:", e));
                });
            } else {
                const msg = language === 'fr'
                    ? "La sauvegarde sur le cloud est une fonctionnalité Premium. Vos flashcards sont enregistrées localement. Abonnez-vous pour les sauvegarder en ligne !"
                    : language === 'ar'
                    ? "النسخ الاحتياطي السحابي ميزة مدفوعة. تم حفظ بطاقاتك تعليمية محلياً. اشترك لحفظها عبر الإنترنت!"
                    : "Cloud backup is a Premium feature. Your flashcards are saved locally. Subscribe to save them online!";
                triggerPremiumAlert(
                    language === 'fr' ? "Sauvegarde Locale Uniquement 💾" : "Local Backup Only 💾",
                    msg,
                    language === 'fr' ? "Activer le Cloud" : "Activate Cloud Backup",
                    () => {
                        window.dispatchEvent(new CustomEvent('nav_change', { detail: 'pricing' }));
                    }
                );
            }
        }
    }, [userId, user?.is_premium, user?.premium_until, language, decks, getDefaultDecks]);

    const deleteFlashcardDeck = useCallback((id: string) => {
        setDecks(prev => {
            const updated = prev.filter(d => d.id !== id);
            const deckKey = userId ? `levelmak_${userId}_decks` : 'levelmak_decks';
            localStorage.setItem(deckKey, JSON.stringify(updated));
            return updated;
        });
        setFlashcards(prev => {
            const updated = prev.filter(c => c.deckId !== id);
            const fcKey = userId ? `levelmak_${userId}_flashcards` : 'levelmak_flashcards';
            localStorage.setItem(fcKey, JSON.stringify(updated));
            return updated;
        });

        if (userId && !userId.includes('anon')) {
            import('../../services/contentService').then(({ contentService }) => {
                contentService.deleteFlashcardDeck(id).catch(e => console.error("Error deleting deck from Supabase:", e));
            });
        }
    }, [userId]);

    return {
        quizzes,
        setQuizzes,
        stories,
        setStories,
        books,
        setBooks,
        flashcards,
        setFlashcards,
        decks,
        setDecks,
        saveQuiz,
        deleteQuiz,
        saveStory,
        deleteStory,
        saveBook,
        deleteBook,
        saveFlashcardDeck,
        deleteFlashcardDeck
    };
};
