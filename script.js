document.addEventListener('DOMContentLoaded', async function () {
    // Элементы интерфейса
    const welcomePage = document.getElementById('welcome-page');
    const surveyPage = document.getElementById('survey-page');
    const resultPage = document.getElementById('result-page');
    const calendarPage = document.getElementById('calendar-page');
    const successPage = document.getElementById('success-page');
    const startSurveyBtn = document.getElementById('start-survey');
    const goToCalendarBtn = document.getElementById('go-to-calendar');
    const questionContainer = document.getElementById('question-container');
    const resultTextElement = document.getElementById('result-text');
    const progressBar = document.getElementById('progress');
    const calendarDays = document.getElementById('calendar-days');
    const monthYearElement = document.getElementById('month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const timeSlots = document.getElementById('time-slots');
    const slotsContainer = document.getElementById('slots-container');
    const selectedDateElement = document.getElementById('selected-date');
    const bookButton = document.getElementById('book-button');
    const bookedDateElement = document.getElementById('booked-date');
    const bookedTimeElement = document.getElementById('booked-time');
    const questionCountElement = document.getElementById('question-count');
    const tg = window.Telegram.WebApp;

    // Загрузка вопросов из Gist
    let questions = [];
    try {
        questions = await fetchQuestionsFromGist(); // Загружаем вопросы из Gist
        if (questions.length === 0) {
            console.error('Не удалось загрузить вопросы.');
            return;
        }
        questionCountElement.textContent = `${questions.length} вопрос${getPluralSuffix(questions.length)}`;
    } catch (error) {
        console.error('Ошибка при загрузке вопросов:', error);
        return;
    }

    // Функция для получения правильного окончания слова "вопрос"
    function getPluralSuffix(count) {
        if (count % 10 === 1 && count % 100 !== 11) {
            return ''; // "вопрос"
        } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
            return 'а'; // "вопроса"
        } else {
            return 'ов'; // "вопросов"
        }
    }

    let results = {};
    // Загрузка результатов из Gist
    results = await fetchResultsFromGist(); // Загружаем результаты из Gist
    if (Object.keys(results).length === 0) {
        console.error('Не удалось загрузить результаты.');
        return;
    }

    // Загрузка вопросов из GitHub Gist
    async function fetchQuestionsFromGist() {
        try {
            const gistId = 'c564bff72d54005febc2218a5f2b892c'; // ID Gist
            const fileName = 'questions.json'; // Название файла с вопросами
            const response = await fetch(`https://api.github.com/gists/${gistId}`);
            const data = await response.json();
            const fileContent = data.files[fileName].content;
    
            // Проверяем, является ли содержимое Base64
            let decodedContent;
            if (isBase64(fileContent)) {
                decodedContent = Buffer.from(fileContent, 'base64').toString('utf-8');
            } else {
                decodedContent = fileContent; // Используем содержимое как есть
            }
    
            // Парсим JSON-данные
            return JSON.parse(decodedContent);
        } catch (error) {
            console.error('Ошибка загрузки вопросов:', error);
            return [];
        }
    }

    async function fetchResultsFromGist() {
        try {
            const gistId = '87c3e2331d542324548b60abb7e54560'; // ID Gist
            const fileName = 'results.json'; // Название файла с результатами
    
            // Запрос к GitHub API для получения содержимого Gist
            const response = await fetch(`https://api.github.com/gists/${gistId}`);
            if (!response.ok) {
                throw new Error(`Ошибка загрузки Gist: ${response.status} ${response.statusText}`);
            }
    
            const data = await response.json();
            const file = data.files?.[fileName];
    
            if (!file) {
                throw new Error(`Файл "${fileName}" не найден в Gist.`);
            }
    
            let decodedContent;
            if (isBase64(file.content)) {
                decodedContent = Buffer.from(file.content, 'base64').toString('utf-8');
            } else {
                decodedContent = file.content; // Используем содержимое как есть
            }
    
            // Парсим JSON-данные
            return JSON.parse(decodedContent);
        } catch (error) {
            console.error('Ошибка загрузки результатов:', error);
            return {};
        }
    }
    
    // Состояние приложения
    let currentQuestionIndex = 0;
    let answers = [];
    let currentDate = new Date();
    let selectedDate = null;
    let selectedTimeSlot = null;
    let bookedSlots = {};

    function isBase64(str) {
        try {
            return Buffer.from(str, 'base64').toString('base64') === str;
        } catch (error) {
            return false;
        }
    }

    // Загрузка данных о слотах из GitHub Gist
    async function fetchSlotsFromGist() {
        try {
            const gistId = '1c39c85fe0366fd7e147e3efbe6a492b'; // ID вашего Gist
            const fileName = 'your_slots.csv';

            // Запрос к GitHub API для получения содержимого Gist
            const response = await fetch(`https://api.github.com/gists/${gistId}`);
            const data = await response.json();

            // Извлекаем содержимое файла
            const fileContent = data.files[fileName].content;
            
            // Проверяем, является ли содержимое Base64
            let decodedContent;
            if (isBase64(fileContent)) {
                decodedContent = Buffer.from(fileContent, 'base64').toString('utf-8');
            } else {
                decodedContent = fileContent; // Используем содержимое как есть
            }

             // Парсим CSV-данные
            const rows = decodedContent.split('\n');
            const headers = rows[0].split(',');

            // Формируем объект bookedSlots
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',');
                const date = values[0];
                if (!date) continue;

                bookedSlots[date] = [];
                for (let j = 1; j < headers.length; j++) {
                    bookedSlots[date].push({
                        time: headers[j],
                        available: values[j] === 'TRUE'
                    });
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки слотов:', error);
        }
    }

    // Рендеринг календаря
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                          'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        monthYearElement.textContent = `${monthNames[month]} ${year}`;
        calendarDays.innerHTML = '';
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;
    
        for (let i = 0; i < firstDayAdjusted; i++) {
            calendarDays.appendChild(createDayElement(''));
        }
    
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = createDayElement(day);
            const dateKey = formatDate(new Date(year, month, day));
    
            // Проверяем, есть ли доступные слоты для этой даты
            if (bookedSlots[dateKey]?.some(slot => slot.available)) {
                dayElement.classList.add('available');
            } else {
                dayElement.classList.add('unavailable');
            }
    
            calendarDays.appendChild(dayElement);
        }
    }

    function createDayElement(day) {
        const element = document.createElement('div');
        element.className = 'day' + (day === '' ? ' empty' : '');
        element.textContent = day;
        if (day !== '') {
            element.addEventListener('click', handleDayClick);
        }
        return element;
    }

    // Обработчик выбора даты
    async function handleDayClick(event) {
        const selectedDay = parseInt(event.target.textContent);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        selectedDate = new Date(year, month, selectedDay);
        selectedDateElement.textContent = formatDate(selectedDate);
        timeSlots.classList.remove('hidden');
        await renderTimeSlots(selectedDate);

        console.log('Выбрана дата:', selectedDate); // Отладочный вывод
    }

    // Рендеринг временных слотов
    function renderTimeSlots(date) {
        const dateKey = formatDate(date);
        slotsContainer.innerHTML = '';
        const slotsForDate = bookedSlots[dateKey] || [];

        ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].forEach(time => {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = time;

            const slotData = slotsForDate.find(s => s.time === time);
            if (slotData && !slotData.available) {
                slot.classList.add('booked');
            } else {
                slot.addEventListener('click', () => handleTimeSelect(time, event));
            }

            slotsContainer.appendChild(slot);
        });
    }

    // Обработчик выбора времени
    function handleTimeSelect(time, e) {
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
        if (e && e.target) {
            e.target.classList.add('selected');
        }
        selectedTimeSlot = time;
        bookButton.disabled = false; // Активируем кнопку "Записаться"
        bookButton.classList.remove('disabled');

        console.log('Выбранное время:', selectedTimeSlot); // Отладочный вывод
    }

    // Бронирование слота
    async function bookSlot() {
        if (!selectedDate || !selectedTimeSlot) return;
        try {
            // Показываем страницу успеха
            calendarPage.classList.add('hidden');
            successPage.classList.remove('hidden');
            
            // Устанавливаем информацию о бронировании
            bookedDateElement.textContent = formatDate(selectedDate);
            bookedTimeElement.textContent = selectedTimeSlot;

            sendDataToTelegram();
            
        } catch (error) {
            alert('Ошибка бронирования: ' + error.message);
        }
    }

    async function sendDataToTelegram() {
        // Формируем username
        const username = Telegram.WebApp.initDataUnsafe.user?.username 
            || `${Telegram.WebApp.initDataUnsafe.user?.id}`
            || `${Telegram.WebApp.initDataUnsafe.user?.first_name} ${Telegram.WebApp.initDataUnsafe.user?.last_name || ''}`.trim() 
            || 'Неизвестный пользователь';
        
        const data = {
            answers: answers.map(answer => ({
                questionId: answer.questionId,
                answer: answer.answerText,
                type: answer.answerType
            })),
            result: getMostFrequentAnswerType(),
            date: selectedDate ? formatDate(selectedDate) : null,
            time: selectedTimeSlot,
            username: username
        };
    
        // Преобразуем данные в строку JSON
        const jsonData = JSON.stringify(data);
        // Telegram.WebApp.sendData(jsonData);
        //window.parent.postMessage(jsonData, '*');
        try {
                // Отправляем данные через Fetch API
                const response = await fetch('https://thirsty-kingfisher-32.deno.dev/api/quiz', { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: jsonData
                });

                if (!response.ok) {
                    throw new Error(`Ошибка HTTP! Статус: ${response.status}`);
                }
                const result = await response.json();
                console.log('Ответ сервера:', result);
            } catch (error) {
                console.error('Ошибка при отправке данных:', error);
                Telegram.WebApp.showAlert('⚠️ Произошла ошибка при отправке данных.');
            }
        }
    
    // Форматирование даты
    function formatDate(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    // Определение наиболее частого типа ответа
    function getMostFrequentAnswerType() {
        // Создаем динамический объект typeCounts на основе загруженных результатов
        const typeCounts = {};
        for (const type in results) {
            typeCounts[type] = 0; // Инициализируем счетчики нулями
        }
    
        // Подсчитываем частоту типов ответов
        answers.forEach(answer => {
            if (answer.answerType && typeCounts.hasOwnProperty(answer.answerType)) {
                typeCounts[answer.answerType]++;
            }
        });
    
        // Находим наиболее часто встречающийся тип
        let maxCount = 0;
        let maxType = null;
    
        for (const type in typeCounts) {
            if (typeCounts[type] > maxCount) {
                maxCount = typeCounts[type];
                maxType = type;
            }
        }
    
        return maxType;
    }

    // Показ результата опроса
    function showResult() {
        const resultType = getMostFrequentAnswerType();
        const resultText = results[resultType];
        
        // Устанавливаем текст результата
        resultTextElement.textContent = resultText;
        
        // Показываем страницу с результатом
        surveyPage.classList.add('hidden');
        resultPage.classList.remove('hidden');
    }

    // Показ вопроса
    function showQuestion(index) {
        progressBar.style.width = `${(index / questions.length) * 100}%`;
        const question = questions[index];
        questionContainer.innerHTML = `
            <div class="question-tile">
                <h3 class="question-title">${question.question}</h3>
                <div class="options">
                    ${question.options.map((option, i) => `
                        <div class="option" data-index="${i}" data-type="${option.type}">
                            <i class="option-icon ${option.icon}"></i>
                            <span class="option-text">${option.text}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        questionContainer.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', function () {
                document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                const optionIndex = parseInt(this.dataset.index);
                const optionType = this.dataset.type;
                answers[index] = {
                    questionId: question.id,
                    answerText: question.options[optionIndex].text,
                    answerType: optionType,
                    answer: optionIndex
                };
                setTimeout(() => {
                    if (index < questions.length - 1) {
                        showQuestion(index + 1);
                    } else {
                        // Показываем результат после завершения опроса
                        showResult();
                    }
                }, 500);
            });
        });
    }
    

    // Сброс состояния
    function resetState() {
        currentQuestionIndex = 0;
        answers = [];
        selectedDate = null;
        selectedTimeSlot = null;
        bookedSlots = {};
        progressBar.style.width = '0%';
        resultPage.classList.add('hidden');
        calendarPage.classList.add('hidden');
        surveyPage.classList.add('hidden');
    }

    // Навигация по месяцам
    function updateMonth(offset) {
        currentDate.setMonth(currentDate.getMonth() + offset);
        renderCalendar();
        timeSlots.classList.add('hidden');
    }

    // Инициализация событий
    startSurveyBtn.addEventListener('click', () => {
        welcomePage.classList.add('hidden');
        surveyPage.classList.remove('hidden');
        tg.expand();
        showQuestion(0);
    });

    goToCalendarBtn.addEventListener('click', () => {
        resultPage.classList.add('hidden');
        calendarPage.classList.remove('hidden');
        renderCalendar();
    });    

    bookButton.addEventListener('click', bookSlot);
    prevMonthBtn.addEventListener('click', () => updateMonth(-1));
    nextMonthBtn.addEventListener('click', () => updateMonth(1));

    // Первоначальная загрузка
    fetchSlotsFromGist().then(renderCalendar);
});
