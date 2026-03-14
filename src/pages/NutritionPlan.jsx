import { useState } from 'react'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import DayCalendar from '../components/DayCalendar.jsx'
import MealCard from '../components/MealCard.jsx'
import MealDetailSheet from '../components/MealDetailSheet.jsx'
import './Results.css'

const MEALS_MOCK = [
  {
    title: 'Овсяная каша на молоке Пятеро...',
    statusTag: 'Медленные углеводы, стабильный сахар',
    composition: 'Молоко 2,5%, вода питьевая, хлопья овсяные, сахар, масло сливочное, соль, крахмал, ароматизатор.',
    calories: '280 ккал',
    protein: 12,
    fat: 8,
    carbs: 45,
  },
  {
    title: 'Куриное филе с гречкой и овощами',
    statusTag: 'Белок + клетчатка, контроль аппетита',
    composition: 'Куриное филе, гречка, томаты, огурцы, оливковое масло, зелень, соль, перец.',
    calories: '420 ккал',
    protein: 38,
    fat: 14,
    carbs: 32,
  },
  {
    title: 'Рыба на пару с овощами',
    statusTag: 'Лёгкий ужин, поддержка сердца',
    composition: 'Филе рыбы, брокколи, стручковая фасоль, морковь, оливковое масло, лимон, зелень.',
    calories: '290 ккал',
    protein: 28,
    fat: 10,
    carbs: 18,
  },
]

function NutritionPlan() {
  const [activeMeal, setActiveMeal] = useState(null)

  return (
    <Page className="results-page">
      <Header title="Ваш рацион" showBack />
      <DayCalendar />

      <MealCard
        mealType="Завтрак"
        time="08:00"
        title="Овсяная каша на молоке"
        description="Молоко 2,5%, овсяные хлопья, немного меда и ягоды."
        tag="Медленные углеводы, стабильный сахар"
        onClick={() => setActiveMeal(MEALS_MOCK[0])}
      />

      <MealCard
        mealType="Обед"
        time="13:00"
        title="Куриное филе с гречкой и овощами"
        description="Куриное филе без кожи, гречка, овощной салат с оливковым маслом."
        tag="Белок + клетчатка, контроль аппетита"
        onClick={() => setActiveMeal(MEALS_MOCK[1])}
      />

      <MealCard
        mealType="Ужин"
        time="19:00"
        title="Рыба на пару с овощами"
        description="Филе рыбы, брокколи, стручковая фасоль, немного оливкового масла."
        tag="Лёгкий ужин, поддержка сердца"
        onClick={() => setActiveMeal(MEALS_MOCK[2])}
      />

      <MealDetailSheet
        open={!!activeMeal}
        onClose={() => setActiveMeal(null)}
        meal={activeMeal}
      />
    </Page>
  )
}

export default NutritionPlan

