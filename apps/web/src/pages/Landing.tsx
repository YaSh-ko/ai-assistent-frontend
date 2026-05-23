import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import ParticlesBackground from "@/components/ParticlesBackground";
import LandingFooter from "@/components/LandingFooter";
import memoryIcon from "@/assets/memory.png";
import overtimeIcon from "@/assets/overtime.png";
import historyIcon from "@/assets/history.png";
import padlockIcon from "@/assets/padlock.png";
import shieldIcon from "@/assets/shield.png";
import configurationIcon from "@/assets/configuration.png";
import macbookImage from "@/assets/Macbook Air M2 Silver Flatten.png";
import circleOfSinsImage from "@/assets/circle_of_sins.png";
import "../styles/landing.css";

export default function Landing() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? "hidden" : "unset";
    }, [isMenuOpen]);

    return (
        <div className="landing-body">
            <ParticlesBackground />
            
            {/* Header */}
            <header className="landing-header">
                <div className="container">
                <div className="logo">
                        <h1>Delёz</h1>
                    </div>
                    <nav className="nav-sections">
                        <a href="#how-it-works" className="nav-section-link">Как это работает</a>
                        <button type="button" className="nav-section-link" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Тарифы</button>
                        <a href="#audience" className="nav-section-link">О нас</a>
                        <a href="#cta" className="nav-section-link">Контакты</a>
                    </nav>
                    <nav className="nav">
                        <Link to="/sign-in" className="nav-link">Войти</Link>
                        <Link to="/beta-test" className="nav-btn">Бета-тестирование</Link>
                    </nav>
                    <button className={`burger ${isMenuOpen ? 'burger--close' : ''}`} onClick={toggleMenu}>
                        <span className="burger__line"></span>
                        <span className="burger__line"></span>
                        <span className="burger__line"></span>
                    </button>
                    <div className={`landing-header-mobile ${isMenuOpen ? "active" : ""}`}>
                        <nav className="nav-sections">
                            <a href="#how-it-works" className="nav-section-link">Как это работает</a>
                            <button type="button" className="nav-section-link" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Тарифы</button>
                            <a href="#audience" className="nav-section-link">О нас</a>
                            <a href="#cta" className="nav-section-link">Контакты</a>
                        </nav>
                        <nav className="nav">
                            <Link to="/sign-in" className="nav-link">Войти</Link>
                            <Link to="/beta-test" className="nav-btn">Бета-тестирование</Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <h1 className="hero-title">
                            Трудно разобраться в себе? <br />
                            <span className="highlight">Разберёмся вместе.</span>
                        </h1>
                        <p className="hero-subtitle">
                            Delёz — персональный ИИ-ассистент, который помогает осмыслить события, эмоции и решения через призму философии Жиля Делёза.
                        </p>
                        <div className="hero-buttons">
                            <Link to="/beta-test" className="btn-primary">
                                Записаться на бета-тест
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="problem">
                <div className="container">
                    <h2 className="section-title">Одна мысль не даёт спать?</h2>
                    <p className="problem-text">
                        Обычные дневники и чат-боты забывают твой контекст. Ты снова и снова наступаешь на те же грабли, потому что:
                    </p>
                    <div className="problem-list">
                        <div className="problem-item">
                            <img src={memoryIcon} alt="Выводы забываются" className="problem-icon" />
                            <span>Выводы забываются</span>
                        </div>
                        <div className="problem-item">
                            <img src={overtimeIcon} alt="ИИ даёт шаблонные ответы" className="problem-icon" />
                            <span>ИИ даёт шаблонные ответы</span>
                        </div>
                        <div className="problem-item">
                            <img src={historyIcon} alt="Уроки прошлого не работают в настоящем" className="problem-icon" />
                            <span>Уроки прошлого не работают в настоящем</span>
                        </div>
                    </div>
                    <div className="cycle-image-container">
                        <h3 className="cycle-text">Ты остаёшься в цикле</h3>
                        <img src={circleOfSinsImage} alt="Круг грехов" className="cycle-image" />
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="how-it-works">
                <div className="container">
                    <h2 className="section-title">Delёz запоминает, анализирует и связывает</h2>
                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <h3>Обсуждаешь событие с ИИ</h3>
                            <p>Используем GigaChat для глубокого анализа твоих переживаний</p>
                        </div>
                        <div className="step-card">
                            <div className="step-number">2</div>
                            <h3>ИИ создаёт узлы из разговора</h3>
                            <p>
                                Прошлые события<br/>
                                Само событие<br/>
                                Эмоции<br/>
                                Выводы<br/>
                                Будущее влияние
                            </p>
                        </div>
                        <div className="step-card">
                            <div className="step-number">3</div>
                            <h3>Визуализируешь связи</h3>
                            <p>Видишь ризому (сеть) своих мыслей и переживаний</p>
                        </div>
                        <div className="step-card">
                            <div className="step-number">4</div>
                            <h3>Отслеживаешь трансформацию</h3>
                            <p>Наблюдаешь, как ты меняешься во времени</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Visual System */}
            <section className="visual-system">
                <div className="container">
                    <h2 className="section-title">Все события фиксируются ассистентом и связываются с остальными</h2>
                    <p className="section-subtitle">
                        Все наши события, 
                        решения, эмоции и 
                        желания — это 
                        переплетённая сеть 
                        влияний, порождающая 
                        новые смыслы и 
                        возможности.
                    </p>
                    <div className="rhizome-description">
                        <p>Delёz строит ризому - граф, связывающий произошедшее воедино. Он находит связи между событиями и визуализирует их положительным или негативным окрасом.</p>
                    </div>
                    <div className="demo-section">
                        <img src={macbookImage} alt="Пример ризомы в Delёz" className="macbook-demo" />
                        <p className="demo-caption">Пример ризомы: связи между событиями, эмоциями и выводами</p>
                    </div>
                </div>
            </section>

            {/* AI Assistant Section */}
            <section className="ai-assistant">
                <div className="container">
                    <h2 className="section-title">Это не просто дневник. Это пожизненный ИИ-ассистент</h2>
                    <p className="hover-hint">*наведи, чтобы узнать больше*</p>
                    <div className="assistant-grid">
                        <div className="assistant-card">
                            <h4>Растет вместе с тобой</h4>
                            <p className="assistant-description">Показывает то, как ты изменился и что на тебя повлияло</p>
                        </div>
                        <div className="assistant-card">
                            <h4>Задает правильные вопросы</h4>
                            <p className="assistant-description">Он не навязывает своё решение, а помогает тебе самому его найти</p>
                        </div>
                        <div className="assistant-card">
                            <h4>Превращает хаос в мудрость</h4>
                            <p className="assistant-description">Из разрозненных событий создает связную историю твоей жизни</p>
                        </div>
                        <div className="assistant-card">
                            <h4>Защищает приватность</h4>
                            <p className="assistant-description">Благодаря end-to-end шифрованию и zero-knowledge архитектуре</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Experiments */}
            <section className="experiments">
                <div className="container">
                    <h2 className="section-title">Проверяй гипотезы о себе</h2>
                    <div className="experiment-example">
                        <h3>Пример эксперимента: «Разрыв токсичных отношений»</h3>
                        <div className="experiment-details">
                            <div className="experiment-item">
                                <strong>Гипотеза:</strong> После разрыва эмоциональная интенсивность вырастет
                            </div>
                            <div className="experiment-item">
                                <strong>Реальность:</strong> Первая неделя — падение до -8, затем постепенное восстановление
                            </div>
                            <div className="experiment-item">
                                <strong>Выводы:</strong> Важно проживать фазу утраты, даже если отношения были токсичными
                            </div>
                        </div>
                    </div>
                    <div className="experiment-button">
                        <Link to="/beta-test" className="btn-primary">Записаться на бета-тест</Link>
                    </div>
                </div>
            </section>

            {/* Analysis */}
            <section className="analysis">
                <div className="container">
                    <h2 className="section-title">Анализируй, как ты меняешься</h2>
                    <div className="analysis-grid">
                        <div className="analysis-card">
                            <h4>Как ты изменился за месяц/год</h4>
                        </div>
                        <div className="analysis-card">
                            <h4>Что повлияло на тебя больше всего</h4>
                        </div>
                        <div className="analysis-card">
                            <h4>Как изменилось твоё состояние</h4>
                        </div>
                        <div className="analysis-card">
                            <h4>Паттерны из прошлого</h4>
                        </div>
                    </div>
                    <p className="analysis-tech">
                        Инструмент: Встроенный анализ через GraphAG и поиск по эмбеддингам (EmbeddingsGigaR)
                    </p>
                </div>
            </section>

            {/* Security */}
            <section className="security">
                <div className="container">
                    <h2 className="section-title">Твои данные принадлежат только тебе</h2>
                    <div className="security-features">
                        <div className="security-item">
                            <img src={padlockIcon} alt="End-to-end шифрование" className="security-icon" />
                            <h4>End-to-end шифрование</h4>
                        </div>
                        <div className="security-item">
                            <img src={shieldIcon} alt="Zero-knowledge архитектура" className="security-icon" />
                            <h4>Zero-knowledge архитектура</h4>
                        </div>
                        <div className="security-item">
                            <img src={configurationIcon} alt="Локальные модели GigaChat" className="security-icon" />
                            <h4>Локальные модели GigaChat</h4>
                        </div>
                    </div>
                </div>
            </section>

            {/* Target Audience */}
            <section id="audience" className="audience">
                <div className="container">
                    <h2 className="section-title">Для кого это?</h2>
                    <div className="audience-grid">
                        <div className="audience-card">
                            <h4>13–18 лет</h4>
                            <p>Формирование навыка рефлексии</p>
                        </div>
                        <div className="audience-card">
                            <h4>18–35 лет</h4>
                            <p>Поиск себя, карьера, отношения</p>
                        </div>
                        <div className="audience-card">
                            <h4>35–55 лет</h4>
                            <p>Переоценка жизни, работа с паттернами</p>
                        </div>
                        <div className="audience-card">
                            <h4>55+ лет</h4>
                            <p>Осмысление прожитого, завершение гештальтов</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Philosophy */}
            <section className="philosophy">
                <div className="container">
                    <h2 className="section-title">Основано на концепциях Жиля Делёза</h2>
                    <div className="concepts-grid">
                        <div className="concept-item">Ризома (сеть без центра)</div>
                        <div className="concept-item">Виртуальное и актуальное</div>
                        <div className="concept-item">Различие и повторение</div>
                        <div className="concept-item">Складка</div>
                        <div className="concept-item">Становление</div>
                        <div className="concept-item">Интенсивность</div>
                    </div>
                    <p className="philosophy-text">
                        Delёz помогает не просто записывать события, а видеть связи, интенсивность и процесс становления себя.
                    </p>
                </div>
            </section>

            {/* CTA Section */}
            <section id="cta" className="cta">
                <div className="container">
                    <div className="cta-content">
                        <h2>Начни вести дневник, который растёт вместе с тобой</h2>
                        <p>Записывай события, цели, эмоции. Анализируй, как ты меняешься. Экспериментируй с собой. Превращай хаос в мудрость.</p>
                        <div className="cta-buttons">
                            <Link to="/beta-test" className="btn-primary">Записаться на бета-тест</Link>
                            <button type="button" className="btn-secondary">App Store</button>
                            <button type="button" className="btn-secondary">Google Play</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <LandingFooter />
        </div>
    );
}