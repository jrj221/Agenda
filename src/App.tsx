import Homepage from './components/Homepage'
import { HomepagePresenter } from './presenters/HomepagePresenter'

function App() {
  return (
    <Homepage 
      presenterFactory={(listener) => new HomepagePresenter(listener)} 
    />
  )
}

export default App
