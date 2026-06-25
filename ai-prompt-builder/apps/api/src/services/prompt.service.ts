export class PromptService {
  /**
   * Template එක සහ User Input එකතු කර අවසාන Prompt එක සාදයි
   * උදා: templateContent = "You are a {{role}}. Do {{task}}."
   * userInput = { role: "Developer", task: "write code" }
   */
  static buildPrompt(templateContent: string, userInput: Record<string, string>): string {
    let finalPrompt = templateContent;

    // userInput එකේ තියෙන හැම වචනයක්ම අරගෙන ආදේශ කරනවා
    for (const [key, value] of Object.entries(userInput)) {
      // {{key}} කියන එක හොයාගන්න Regex එකක් පාවිච්චි කරනවා (කීප තැනක තිබුණත් මාරු වෙන්න 'g' flag එක දානවා)
      const placeholderRegex = new RegExp(`{{${key}}}`, 'g');
      finalPrompt = finalPrompt.replace(placeholderRegex, value);
    }

    return finalPrompt;
  }
}