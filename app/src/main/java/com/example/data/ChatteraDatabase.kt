package com.example.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface ChatteraDao {
    @Query("SELECT * FROM contacts")
    fun getAllContacts(): Flow<List<ContactEntity>>

    @Query("SELECT COUNT(*) FROM contacts")
    suspend fun getContactCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertContacts(contacts: List<ContactEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertContact(contact: ContactEntity)

    @Update
    suspend fun updateContact(contact: ContactEntity)

    @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY createdAtMs ASC")
    fun getMessagesForConversation(conversationId: String): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages ORDER BY createdAtMs ASC")
    fun getAllMessages(): Flow<List<MessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<MessageEntity>)

    @Query("SELECT * FROM messages WHERE id = :id LIMIT 1")
    suspend fun getMessageById(id: String): MessageEntity?

    @Update
    suspend fun updateMessage(message: MessageEntity)

    @Query("SELECT * FROM call_logs ORDER BY createdAtMs DESC")
    fun getAllCallLogs(): Flow<List<CallLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCallLogs(logs: List<CallLogEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCallLog(log: CallLogEntity)

    @Query("SELECT * FROM wallet_transactions ORDER BY createdAtMs DESC")
    fun getAllWalletTransactions(): Flow<List<WalletTransactionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWalletTransactions(txs: List<WalletTransactionEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWalletTransaction(tx: WalletTransactionEntity)

    @Query("SELECT * FROM stories ORDER BY createdAtMs DESC")
    fun getAllStories(): Flow<List<StoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStories(stories: List<StoryEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStory(story: StoryEntity)
}

@Database(
    entities = [
        ContactEntity::class,
        MessageEntity::class,
        CallLogEntity::class,
        WalletTransactionEntity::class,
        StoryEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class ChatteraDatabase : RoomDatabase() {
    abstract fun chatteraDao(): ChatteraDao

    companion object {
        @Volatile
        private var INSTANCE: ChatteraDatabase? = null

        fun getInstance(context: Context): ChatteraDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ChatteraDatabase::class.java,
                    "chattera_e2ee.db"
                ).fallbackToDestructiveMigration(true).build()
                INSTANCE = instance
                instance
            }
        }
    }
}

class ChatteraRepository(private val dao: ChatteraDao) {
    val contacts: Flow<List<ContactEntity>> = dao.getAllContacts()
    val allMessages: Flow<List<MessageEntity>> = dao.getAllMessages()
    val callLogs: Flow<List<CallLogEntity>> = dao.getAllCallLogs()
    val walletTransactions: Flow<List<WalletTransactionEntity>> = dao.getAllWalletTransactions()
    val stories: Flow<List<StoryEntity>> = dao.getAllStories()

    suspend fun getContactCount(): Int = dao.getContactCount()
    suspend fun insertContacts(contacts: List<ContactEntity>) = dao.insertContacts(contacts)
    suspend fun insertContact(contact: ContactEntity) = dao.insertContact(contact)
    suspend fun updateContact(contact: ContactEntity) = dao.updateContact(contact)

    suspend fun insertMessage(message: MessageEntity) = dao.insertMessage(message)
    suspend fun insertMessages(messages: List<MessageEntity>) = dao.insertMessages(messages)
    suspend fun getMessageById(id: String): MessageEntity? = dao.getMessageById(id)
    suspend fun updateMessage(message: MessageEntity) = dao.updateMessage(message)

    suspend fun insertCallLogs(logs: List<CallLogEntity>) = dao.insertCallLogs(logs)
    suspend fun insertCallLog(log: CallLogEntity) = dao.insertCallLog(log)

    suspend fun insertWalletTransactions(txs: List<WalletTransactionEntity>) = dao.insertWalletTransactions(txs)
    suspend fun insertWalletTransaction(tx: WalletTransactionEntity) = dao.insertWalletTransaction(tx)

    suspend fun insertStories(stories: List<StoryEntity>) = dao.insertStories(stories)
    suspend fun insertStory(story: StoryEntity) = dao.insertStory(story)
}
