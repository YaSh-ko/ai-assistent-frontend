import { Link } from "react-router-dom";

export default function LandingFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-logo">
            <h3>Delёz</h3>
            <p>Персональный ИИ-ассистент на всю жизнь</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Продукт</h4>
              <Link to="/sign-in">Войти</Link>
              <Link to="/sign-up">Регистрация</Link>
              <Link to="/">О проекте</Link>
            </div>
            <div className="footer-column">
              <h4>Документы</h4>
              <Link to="/privacy">Политика конфиденциальности</Link>
              <Link to="/terms">Пользовательское соглашение</Link>
            </div>
            <div className="footer-column">
              <h4>Поддержка</h4>
              <a href="mailto:delez.ai@mail.ru">delez.ai@mail.ru</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>ИП: Котельникова Екатерина Андреевна</p>
          <p>ИНН: 254009911186</p>
          <p>ОРГНИП: 325784700387792</p>
          <p>&copy; 2026 Delёz. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
