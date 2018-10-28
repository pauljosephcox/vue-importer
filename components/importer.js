
module.exports = Vue.component('vue-importer',{
   props:['type'],
   data: function(){
       return {
           heading: "Vue Importer Heading",
           options: [
               {value:'rss',text:'RSS Feed'},
           ],
           feedType: null,
           rssFeed: '',
           items: [],
           category: '',
           author: '',
           importing: false,
           loading: false,
           total: 0,
           images: {},
           importAudio: 'import',
           importType: 'rss'

       }
   },
   methods:{
       scanFeed(){
           if(!this.rssFeed) return;
           this.loading = true;

           // Set Route
           let path = '/api/v1/blogs/read/?rss=';
           if(this.type == 'podcasts' && this.importType == 'rss') path = '/api/v1/podcast/read/?rss=';
           else if(this.type == 'podcasts' && this.importType == 'seriesengine') path = '/api/v1/podcast/read/?seriesengine=';

           fetch(path+this.rssFeed)
           .then(response => response.json())
           .then(response => {
               this.category = response.title;
               this.items = response.items;
               this.loading = false;
               this.total = 0;
           })
           .catch(e => {
               this.loading = false;
               this.importing = false;
               this.total=0;
           })
       },

       importItem(item, data){

           item.importing = true;

           let self = this;
           if(!data) data = this.items;
           item.categories.push(this.category)


           // Set Route
           let path = '/api/v1/blog';
           if(this.type == 'podcasts') path = '/api/v1/podcast/episode';

           return new Promise(function(resolve,reject){

               let sendData = {
                   title: item.title,
                   content: (item.content) ? item.content : '',
                   image: (self.images[item.image]) ? self.images[item.image] : item.image,
                   categories: item.categories.join(','),
                   author: (item.author) ? item.author : self.author,
                   time: item.pubDate,
                   description: (item.description) ? item.description : '',
                   audio: (item.audio) ? item.audio : '',
                   duration: (item.duration) ? item.duration : '',
                   import_audio: (self.importAudio) ? self.importAudio : false
                }

                if(item.oembed) sendData.oembed = item.oembed;

               fetch(path,{
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    method: "POST",
                    body: JSON.stringify(sendData)
               })
               .then(response => response.json())
               .then(response =>{

                    if(response){

                        let cleanTitle = response.title.replace('\'',"'")
                        let index = data.findIndex((item) => item.title == cleanTitle)
                        data.splice(index,1);
                        self.progress++;
                        self.total++;

                        // Save Images
                        if(response.attachment_id){
                            self.images[item.image] = response.attachment_id;
                        }

                    }
                    resolve(response)

               }).catch(e =>{
                   console.log(e,"ERROR");
                   item.importing = false;
                   reject(e);
               })

           });

       },
        importAll(){

            if(this.importing == true) return;
            this.importing = true;

            // Import All Items :)
            let self = this;
            TheChurchCo_Utils.awaitArray(self.items,(item) => {
                return self.importItem(item,self.items);
            })

        },
        skipItem(post){
            let index = this.items.findIndex((item) => item.title == post.title)
            this.items.splice(index,1);
        }
   },
   template:
    `<div class="importer">

        <div class="tccspinner" v-if="loading"></div>

        <div class="section" v-if="items.length <= 0 && total == 0">

            <div class="form-field" v-if="type == 'podcasts'">
                <label>Import Type</label>
                <select v-model="importType">
                    <option value="rss">RSS Feed</option>
                    <option value="seriesengine">Series Engine</option>
                </select>
            </div>

            <div class="form-field">
                <label>Enter the URL to your RSS Feed</label>
                <input type="text" v-model="rssFeed" />
            </div>

            <div class="form-field">
                <button class="button-primary" v-on:click="scanFeed">Scan Feed</button>
            </div>

        </div>

        <div class="section" v-if="items.length <= 0 && total > 0">

            <h3>Success</h3>
            <p>{{total}} Items Imported</p>

        </div>

        <div class="section" v-if="items.length > 0">

            <div class="heading">

                <div class="form-field">
                    <label>Category</label>
                    <input type="text" v-model="category" />
                </div>

                <div class="form-field">
                    <label>Default Author (if not found)</label>
                    <input type="text" v-model="author" />
                    <p><b>{{items.length}} Items</b></p>
                </div>

                <div class="form-field" v-if="type == 'podcasts'">
                    <label>Import Audio? </label><br>
                    <select v-model="importAudio">
                        <option value="import">Import</option>
                        <option value="external">Host Elsewhere</option>
                    </select>
                </div>

                <div class="controls" v-if="!this.importing">

                    <div class="form-field">
                        <button v-on:click="importAll" class="button-primary">Import All</button>
                    </div>

                </div>
                <div v-else>{{total}} Items Imported</div>
            </div>

            <transition-group name="importer" tag="div">

                <div class="importer-item" v-for="(item,index) in items" v-bind:key="item.link" v-bind:data-index="index">

                    <div v-bind:class="{'item-wrap':true, '-importing' : item.importing}">

                        <div class="image" v-if="item.image"><img v-bind:src="item.image" /></div>

                        <div class="details">
                            <span class="title">{{item.title}}</span>
                            <span class="author">{{item.author}}</span>
                        </div>

                        <div class="importer-item-controls" v-if="!item.importing">
                            <span class="icon icon-cancel-circled" v-on:click="skipItem(item);"></span>
                            <span class="icon icon-check" v-on:click="importItem(item);"></span>
                        </div>

                    </div>

                </div>

            </transition-group>

        </div>

    </div>`
});
