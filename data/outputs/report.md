# LLM Evaluation Prototype Report

## Dataset Summary
- Total examples: 16
- Scenario distribution: {'normal': 4, 'noisy': 4, 'short_text': 4, 'boundary_case': 4}
- Sentiment distribution: {'positive': 12, 'neutral': 3, 'negative': 1}

## Metrics Summary
- Accuracy: 56.25%
- Format compliance rate: 100.00%
- Abnormal output rate: 100.00%

## Failed Examples
- ID: sample-001
  Comment: 最爱小孩子猜声音那段，算得上看过的电影里相当浪漫的叙事了。很温和也很有爱。
  Gold sentiment: positive
  Predicted sentiment: neutral
  Raw output: sentiment: neutral
keywords: 最爱小孩子猜声音那段, 算得上看过的电影里相当浪漫的叙事了, 很温和也很有爱
- ID: sample-004
  Comment: 茉莉才是看完了王铁梅所有的报道。去创造新的游戏规则！
  Gold sentiment: positive
  Predicted sentiment: 
  Raw output: analysis uncertain
- ID: sample-008
  Comment: 太喜欢了！是那种看完了会庆幸“啊我来电影院就是为了看这种电影！”的感觉，每一个点都可以精准地戳中自己，在全场无数次的大笑鼓掌中收获了特别多的感动和愉悦。邵导继续稳定输出，依然发生在上海，这次聚焦当代沪漂人的日常，态度温和但表达坚定。单亲妈妈不必是超人，恋爱脑也没什么可耻的，你可以犯错可以脆弱可以愤怒也可以胆怯。创作虽然会痛苦，但做一个台下鼓掌的观众也没什么不好，男人是可以雄竞的，没有血缘也是可以组建家庭的。街头可以弹唱也可以cos，小朋友也是可以不用卷的。女性叙事跟女性表达当然不用总是苦哈哈的，但如果还有人没看到那就要一直重复一直说。拒绝“爹味”叙事但支持“妈味”表达！现在可以光荣地宣布，这不仅是好东西，更是中国院线最应该出现也最值得被看见的东西！激情五星了！
  Gold sentiment: positive
  Predicted sentiment: 
  Raw output: analysis uncertain
