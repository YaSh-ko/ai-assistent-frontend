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
                            Личный рост — <br />
                            <span className="highlight">с опорой на данные.</span>
                        </h1>
                        <p className="hero-subtitle">
                            Delёz — интеллектуальный ассистент на графе знаний: фиксируй цели и эксперименты, связывай опыт и видь, куда ты движешься.
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
                    <h2 className="section-title">Планы есть, прогресс — нет?</h2>
                    <p className="problem-text">
                        Заметки разбросаны, чат-боты не помнят контекст, а цели живут отдельно от действий. В итоге сложно понять, что реально работает:
                    </p>
                    <div className="problem-list">
                        <div className="problem-item">
                            <img src={memoryIcon} alt="Цели теряются" className="problem-icon" />
                            <span>Цели и гипотезы теряются</span>
                        </div>
                        <div className="problem-item">
                            <img src={overtimeIcon} alt="Нет связи между шагами" className="problem-icon" />
                            <span>Нет связи между шагами и результатом</span>
                        </div>
                        <div className="problem-item">
                            <img src={historyIcon} alt="ИИ не видит вашу историю" className="problem-icon" />
                            <span>ИИ не видит вашу историю развития</span>
                        </div>
                    </div>
                    <div className="cycle-image-container">
                        <h3 className="cycle-text">Рост без системы — хаос</h3>
                        <div className="cycle-visual" aria-hidden="true">
                            <span className="cycle-visual__node" />
                            <span className="cycle-visual__node" />
                            <span className="cycle-visual__node" />
                            <span className="cycle-visual__line" />
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="how-it-works">
                <div className="container">
                    <h2 className="section-title">Delёz собирает, связывает и показывает прогресс</h2>
                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-number">1</div>
                            <h3>Фиксируешь шаг в чате</h3>
                            <p>Цель, эксперимент или заметка — ассистент понимает контекст диалога</p>
                        </div>
                        <div className="step-card">
                            <div className="step-number">2</div>
                            <h3>Сущности попадают в граф</h3>
                            <p>
                                События и инсайты<br/>
                                Цели и желания<br/>
                                Эксперименты<br/>
                                Связи между ними
                            </p>
                        </div>
                        <div className="step-card">
                            <div className="step-number">3</div>
                            <h3>Смотришь карту знаний</h3>
                            <p>Гибридный поиск и Neo4j показывают, что на что влияет</p>
                        </div>
                        <div className="step-card">
                            <div className="step-number">4</div>
                            <h3>Корректируешь курс</h3>
                            <p>Аналитика и паттерны помогают усилить то, что даёт результат</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Visual System */}
            <section className="visual-system">
                <div className="container">
                    <h2 className="section-title">Граф знаний вместо разрозненных заметок</h2>
                    <p className="section-subtitle">
                        Каждый шаг, цель и эксперимент — узел в персональной сети. 
                        Ассистент находит связи и подсказывает, 
                        что усиливает ваш рост.
                    </p>
                    <div className="rhizome-description">
                        <p>Delёz хранит сущности в PostgreSQL и Neo4j, а гибридный поиск (вектор + граф) помогает быстро находить релевантный контекст для диалога.</p>
                    </div>
                    <div className="demo-section">
                        <img src={macbookImage} alt="Граф знаний Delёz" className="macbook-demo" />
                        <p className="demo-caption">Карта связей: цели, события, эксперименты и выводы</p>
                    </div>
                </div>
            </section>

            {/* AI Assistant Section */}
            <section className="ai-assistant">
                <div className="container">
                    <h2 className="section-title">Не дневник прошлого — инструмент развития</h2>
                    <p className="hover-hint">*наведи на карточку*</p>
                    <div className="assistant-grid">
                        <div className="assistant-card">
                            <h4>Фокус на будущем</h4>
                            <p className="assistant-description">Цели, эксперименты и метрики — не только разбор прошлого</p>
                        </div>
                        <div className="assistant-card">
                            <h4>Контекст из графа</h4>
                            <p className="assistant-description">Ответы опираются на ваши записи и связи между ними</p>
                        </div>
                        <div className="assistant-card">
                            <h4>Детектор сущностей</h4>
                            <p className="assistant-description">После диалога предлагает сохранить цель, событие или эксперимент</p>
                        </div>
                        <div className="assistant-card">
                            <h4>Приватность данных</h4>
                            <p className="assistant-description">Ваш граф и переписка принадлежат только вам</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Experiments */}
            <section className="experiments">
                <div className="container">
                    <h2 className="section-title">Проверяй гипотезы экспериментами</h2>
                    <div className="experiment-example">
                        <h3>Пример: «Утренняя фокус-сессия 25 минут»</h3>
                        <div className="experiment-details">
                            <div className="experiment-item">
                                <strong>Гипотеза:</strong> 5 дней подряд — больше закрытых задач до обеда
                            </div>
                            <div className="experiment-item">
                                <strong>Наблюдение:</strong> +2 задачи в среднем, меньше отвлечений в Slack
                            </div>
                            <div className="experiment-item">
                                <strong>Вывод:</strong> Оставить ритуал, связать с целью «Запуск MVP» в графе
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
                    <h2 className="section-title">Смотри динамику роста</h2>
                    <div className="analysis-grid">
                        <div className="analysis-card">
                            <h4>Прогресс по целям за период</h4>
                        </div>
                        <div className="analysis-card">
                            <h4>Какие эксперименты сработали</h4>
                        </div>
                        <div className="analysis-card">
                            <h4>Связи в графе знаний</h4>
                        </div>
                        <div className="analysis-card">
                            <h4>Повторяющиеся паттерны</h4>
                        </div>
                    </div>
                    <p className="analysis-tech">
                        RAG, гибридный поиск и аналитика по графу Neo4j + эмбеддинги GigaChat
                    </p>
                </div>
            </section>

            {/* Security */}
            <section className="security">
                <div className="container">
                    <h2 className="section-title">Данные под вашим контролем</h2>
                    <p className="section-subtitle security-honest">
                        Delёz разворачивается на вашем инстансе: PostgreSQL, Neo4j и AI-сервис. Мы не продаём ваши диалоги третьим лицам.
                    </p>
                    <div className="security-features">
                        <div className="security-item">
                            <img src={padlockIcon} alt="Защищённое соединение" className="security-icon" />
                            <h4>HTTPS между клиентом и API</h4>
                        </div>
                        <div className="security-item">
                            <img src={shieldIcon} alt="Изоляция данных" className="security-icon" />
                            <h4>Разделение по пользователям</h4>
                        </div>
                        <div className="security-item">
                            <img src={configurationIcon} alt="GigaChat" className="security-icon" />
                            <h4>GigaChat через защищённый API</h4>
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
                            <h4>Студенты и стажёры</h4>
                            <p>Учёба, проекты, первые цели</p>
                        </div>
                        <div className="audience-card">
                            <h4>Специалисты</h4>
                            <p>Карьера, навыки, баланс нагрузки</p>
                        </div>
                        <div className="audience-card">
                            <h4>Предприниматели</h4>
                            <p>Гипотезы, метрики, быстрые итерации</p>
                        </div>
                        <div className="audience-card">
                            <h4>Саморазвитие</h4>
                            <p>Привычки, эксперименты, долгий горизонт</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stack */}
            <section className="philosophy">
                <div className="container">
                    <h2 className="section-title">Технологии под капотом</h2>
                    <div className="concepts-grid">
                        <div className="concept-item">Граф знаний Neo4j</div>
                        <div className="concept-item">Гибридный поиск</div>
                        <div className="concept-item">RAG + GigaChat</div>
                        <div className="concept-item">Детектор сущностей</div>
                        <div className="concept-item">PostgreSQL</div>
                        <div className="concept-item">SSE-стриминг</div>
                    </div>
                    <p className="philosophy-text">
                        Delёz объединяет диалог, структурированные сущности и визуализацию связей — чтобы развитие было измеримым, а не абстрактным.
                    </p>
                </div>
            </section>

            {/* CTA Section */}
            <section id="cta" className="cta">
                <div className="container">
                    <div className="cta-content">
                        <h2>Начни системно расти с Delёz</h2>
                        <p>Ставь цели, проводи эксперименты, фиксируй инсайты. Смотри граф связей и корректируй курс с ассистентом.</p>
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