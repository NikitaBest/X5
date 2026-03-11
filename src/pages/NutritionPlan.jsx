import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import DayCalendar from '../components/DayCalendar.jsx'
import MealCard from '../components/MealCard.jsx'
import './Results.css'

function NutritionPlan() {
  return (
    <Page className="results-page">
      <Header title="Ваш рацион" showBack />
      <DayCalendar />

      {/* Временные заглушки рациона до интеграции с бэкендом */}
      <MealCard
        mealType="Завтрак"
        time="08:00"
        title="Овсяная каша на молоке"
        description="Молоко 2,5%, овсяные хлопья, немного меда и ягоды."
        tag="Медленные углеводы, стабильный сахар"
      />

      <MealCard
        mealType="Обед"
        time="13:00"
        title="Куриное филе с гречкой и овощами"
        description="Куриное филе без кожи, гречка, овощной салат с оливковым маслом."
        tag="Белок + клетчатка, контроль аппетита"
      />

      <MealCard
        mealType="Ужин"
        time="19:00"
        title="Рыба на пару с овощами"
        description="Филе рыбы, брокколи, стручковая фасоль, немного оливкового масла."
        tag="Лёгкий ужин, поддержка сердца"
      />
    </Page>
  )
}

export default NutritionPlan

